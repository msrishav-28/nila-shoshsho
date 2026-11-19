import {theme} from '../theme.config';

function chooseFile(accept, capture) {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (capture) {
      input.setAttribute('capture', 'environment');
    }
    input.addEventListener('change', () => resolve(input.files?.[0] || null), {
      once: true,
    });
    input.addEventListener('cancel', () => resolve(null), {once: true});
    input.click();
  });
}

async function imageFile(file, base64) {
  const uri = URL.createObjectURL(file);
  const cleanup = () => URL.revokeObjectURL(uri);
  try {
    const image = new window.Image();
    image.src = uri;
    await image.decode();
    const ratio = Math.min(1, 1600 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * ratio);
    canvas.height = Math.round(image.height * ratio);
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82),
    );
    if (!blob) {
      throw new Error('Could not read the selected image.');
    }
    const preview = URL.createObjectURL(blob);
    return {
      uri: preview,
      name: 'photo.jpg',
      type: blob.type,
      blob,
      base64: base64
        ? canvas.toDataURL('image/jpeg', 0.82).split(',')[1]
        : undefined,
      cleanup: () => URL.revokeObjectURL(preview),
    };
  } finally {
    cleanup();
  }
}

async function captureFromCamera() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {facingMode: {ideal: 'environment'}},
      audio: false,
    });
  } catch {
    throw new Error(
      'Could not access the camera. Check the browser permission or choose a saved photo.',
    );
  }

  const trigger = document.activeElement;
  const dialog = document.createElement('dialog');
  dialog.setAttribute('aria-label', 'Take a crop photo');
  Object.assign(dialog.style, {
    width: 'min(560px, 90vw)',
    borderRadius: '16px',
    border: `1px solid ${theme.hairline}`,
    padding: '16px',
    background: theme.surface,
    color: theme.ink,
  });
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute('aria-label', 'Camera preview');
  Object.assign(video.style, {
    display: 'block',
    width: '100%',
    maxHeight: '65vh',
    marginBottom: '12px',
  });
  video.srcObject = stream;
  const capture = document.createElement('button');
  capture.textContent = 'Capture photo';
  capture.disabled = true;
  const cancel = document.createElement('button');
  cancel.textContent = 'Cancel';
  for (const button of [capture, cancel]) {
    Object.assign(button.style, {
      minHeight: '48px',
      padding: '8px 14px',
      marginRight: '8px',
      font: 'inherit',
      borderRadius: '12px',
    });
  }
  dialog.append(video, capture, cancel);

  return new Promise((resolve, reject) => {
    let photo = null;
    let failure;
    function close() {
      stream.getTracks().forEach(track => track.stop());
      video.srcObject = null;
      dialog.remove();
      trigger?.focus?.();
      if (failure) {
        reject(failure);
      } else {
        resolve(photo);
      }
    }
    dialog.addEventListener('close', close, {once: true});
    cancel.addEventListener('click', () => dialog.close());
    video.addEventListener('loadeddata', () => {
      capture.disabled = false;
    });
    video.addEventListener('error', () => {
      failure = new Error(
        'The camera preview is unavailable. Choose a saved photo instead.',
      );
      dialog.close();
    });
    capture.addEventListener('click', () => {
      if (!video.videoWidth || !video.videoHeight) {
        return;
      }
      capture.disabled = true;
      const size = Math.min(
        1,
        1600 / Math.max(video.videoWidth, video.videoHeight),
      );
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * size);
      canvas.height = Math.round(video.videoHeight * size);
      canvas
        .getContext('2d')
        .drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => {
          photo = blob;
          if (!blob) {
            failure = new Error('Could not capture the photo.');
          }
          dialog.close();
        },
        'image/jpeg',
        0.85,
      );
    });
    document.body.append(dialog);
    try {
      dialog.showModal();
    } catch {
      failure = new Error(
        'Could not open the camera preview. Choose a saved photo instead.',
      );
      close();
    }
  });
}

export async function choosePhoto({camera = false, base64 = false} = {}) {
  const desktopCapture =
    camera &&
    window.matchMedia?.('(pointer: fine)').matches &&
    navigator.mediaDevices?.getUserMedia &&
    window.HTMLDialogElement?.prototype.showModal;
  const file = desktopCapture
    ? await captureFromCamera()
    : await chooseFile('image/*', camera);
  return file ? imageFile(file, base64) : null;
}

export async function chooseDocument() {
  const file = await chooseFile('application/pdf,.pdf');
  return file
    ? {
        name: file.name,
        type: file.type || 'application/pdf',
        blob: file,
        size: file.size,
      }
    : null;
}

export async function readRemoteDocument(url, name = 'document.pdf') {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    throw new Error(
      'This saved document has no secure download link. Choose the original file to continue.',
    );
  }
  try {
    const response = await fetch(url, {credentials: 'omit', cache: 'no-store'});
    if (!response.ok) {
      throw new Error('Unsuccessful download');
    }
    const blob = await response.blob();
    if (
      blob.type !== 'application/pdf' &&
      !(await blob.slice(0, 5).text()).startsWith('%PDF-')
    ) {
      throw new Error('File is not a PDF');
    }
    return {name, type: 'application/pdf', blob, size: blob.size};
  } catch {
    throw new Error(
      'Could not open the saved PDF in this browser. Choose the original file to continue.',
    );
  }
}

export function appendFile(form, key, {blob, name}) {
  form.append(key, blob, name);
}

export function getLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          'Current location requires a supported browser and a secure connection.',
        ),
      );
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({coords}) => resolve(coords),
      () =>
        reject(
          new Error(
            'Current location is unavailable. Check site permissions and try again.',
          ),
        ),
      {enableHighAccuracy: false, timeout: 12000, maximumAge: 60000},
    );
  });
}

function toWav(audio) {
  const samples = audio.getChannelData(0);
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const write = (offset, text) =>
    Array.from(text).forEach((char, i) =>
      view.setUint8(offset + i, char.charCodeAt(0)),
    );
  write(0, 'RIFF');
  view.setUint32(4, bytes.byteLength - 8, true);
  write(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, audio.sampleRate, true);
  view.setUint32(28, audio.sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, index) =>
    view.setInt16(
      44 + index * 2,
      Math.max(-1, Math.min(1, sample)) * 32767,
      true,
    ),
  );
  return new Blob([bytes], {type: 'audio/wav'});
}

export async function recordVoice() {
  if (
    !navigator.mediaDevices?.getUserMedia ||
    !window.MediaRecorder ||
    !window.AudioContext
  ) {
    throw new Error(
      'Recording needs a supported browser and a secure connection. You can type your question.',
    );
  }
  const stream = await navigator.mediaDevices.getUserMedia({audio: true});
  const release = () => stream.getTracks().forEach(track => track.stop());
  const parts = [];
  let recorder;
  let recording;
  let elapsed;
  try {
    recorder = new window.MediaRecorder(stream);
    recorder.addEventListener('dataavailable', event => {
      if (event.data.size) {
        parts.push(event.data);
      }
    });
    recording = new Promise(resolve => {
      recorder.addEventListener('stop', () => resolve(true), {once: true});
      recorder.addEventListener('error', () => resolve(false), {once: true});
    });
    recorder.start();
    elapsed = Date.now();
  } catch (error) {
    release();
    throw error;
  }
  function finish() {
    if (recorder.state === 'recording') {
      recorder.stop();
    }
    release();
    return recording;
  }
  const stop = async () => {
    const complete = await finish();
    if (!complete || !parts.length) {
      throw new Error(
        'Could not record speech. Try again or type your question.',
      );
    }
    if (Date.now() - elapsed > 30000) {
      throw new Error(
        'Record up to 30 seconds at a time, or type your question.',
      );
    }
    const context = new window.AudioContext({sampleRate: 16000});
    try {
      const recorded = new Blob(parts, {type: recorder.mimeType});
      const decoded = await context.decodeAudioData(
        await recorded.arrayBuffer(),
      );
      return {name: 'speech.wav', type: 'audio/wav', blob: toWav(decoded)};
    } finally {
      await context.close();
    }
  };
  return {
    stop,
    cancel: async () => {
      await finish();
    },
  };
}

export async function playVoice(base64, onFinish) {
  const audio = new window.Audio(`data:audio/wav;base64,${base64}`);
  audio.addEventListener('ended', onFinish, {once: true});
  await audio.play();
  return () => {
    audio.pause();
    audio.removeAttribute('src');
  };
}
