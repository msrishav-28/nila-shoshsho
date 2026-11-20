import {useCallback, useEffect, useRef, useState} from 'react';
import {getAccessToken} from '../utils/api';
import {request} from './data';

export function submissionKey() {
  return (
    global.crypto?.randomUUID?.() ||
    [Date.now(), Math.random(), Math.random()]
      .map(value => value.toString(36).replace('.', ''))
      .join('-')
  );
}

export function usePlots(owner, offline) {
  const [state, setState] = useState(null);
  const [selection, setSelection] = useState(null);
  const revision = useRef(0);
  const current = state?.owner === owner ? state : null;
  const plots = current?.plots || [];
  const selected = selection?.owner === owner ? selection.id : null;
  const active = plots.find(plot => plot.plotId === selected) || plots[0];

  const refresh = useCallback(
    async signal => {
      if (!owner || offline) {
        return;
      }
      const token = getAccessToken();
      const read = ++revision.current;
      setState(previous => ({
        owner,
        plots: previous?.owner === owner ? previous.plots : [],
        pending: true,
      }));
      try {
        const data = await request('account', '/plots', {signal});
        if (!Array.isArray(data?.plots)) {
          throw new Error('The server did not return your plots.');
        }
        if (
          !signal?.aborted &&
          read === revision.current &&
          token === getAccessToken()
        ) {
          setState({owner, plots: data.plots, pending: false});
        }
      } catch (error) {
        if (
          !signal?.aborted &&
          read === revision.current &&
          token === getAccessToken()
        ) {
          setState(previous =>
            previous?.owner === owner
              ? {...previous, error, pending: false}
              : previous,
          );
        }
      }
    },
    [offline, owner],
  );

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const select = id => setSelection({owner, id});
  const write = async (id, options) => {
    const token = getAccessToken();
    const path = id ? `/plots/${encodeURIComponent(id)}` : '/plots';
    const data = await request('account', path, options);
    if (
      data?.success !== true ||
      (options.method !== 'DELETE' && !data.plot?.plotId)
    ) {
      throw new Error('The server did not confirm the plot change.');
    }
    if (token !== getAccessToken()) {
      throw new Error('Sign in again to access your plots.');
    }
    revision.current += 1;
    setState(previous => {
      if (previous?.owner !== owner) {
        return previous;
      }
      const nextPlots =
        options.method === 'PATCH'
          ? previous.plots.map(plot => (plot.plotId === id ? data.plot : plot))
          : previous.plots.filter(
              plot => plot.plotId !== (id || data.plot.plotId),
            );
      return {
        ...previous,
        error: null,
        pending: false,
        plots: id ? nextPlots : [data.plot, ...nextPlots],
      };
    });
    if (data.plot && !id) {
      select(data.plot.plotId);
    }
    return data;
  };

  return {
    plots,
    active,
    error: current?.error,
    pending: Boolean(owner && !offline && (!current || current.pending)),
    refresh,
    select,
    write,
  };
}

export function farmFromPlot(plot) {
  return {
    ...plot,
    name: plot.crop,
    acres: plot.areaAcres,
    location: {lat: plot.lat, lon: plot.lon},
  };
}
