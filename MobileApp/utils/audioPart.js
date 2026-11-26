export function audioPart(uri) {
  const path = String(uri || '').split('?')[0].toLowerCase();
  if (path.endsWith('.wav')) {
    return {name: 'speech.wav', type: 'audio/wav'};
  }
  if (path.endsWith('.m4a')) {
    return {name: 'speech.m4a', type: 'audio/m4a'};
  }
  if (path.endsWith('.mp4') || path.endsWith('.mp4a')) {
    return {name: 'speech.m4a', type: 'audio/mp4'};
  }
  if (path.endsWith('.aac')) {
    return {name: 'speech.aac', type: 'audio/aac'};
  }
  if (path.endsWith('.caf')) {
    return {name: 'speech.caf', type: 'audio/x-caf'};
  }
  if (path.endsWith('.3gp')) {
    return {name: 'speech.3gp', type: 'audio/3gpp'};
  }
  return {name: 'speech.m4a', type: 'audio/m4a'};
}
