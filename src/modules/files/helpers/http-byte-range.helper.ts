export type HttpByteRangeResult =
  | { kind: 'full' }
  | { kind: 'partial'; start: number; end: number }
  | { kind: 'unsatisfiable' };

export function parseHttpByteRange(rangeHeader: string | undefined, fileSize: number): HttpByteRangeResult {
  if (rangeHeader === undefined) return { kind: 'full' };

  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match || !Number.isSafeInteger(fileSize) || fileSize <= 0) {
    return { kind: 'unsatisfiable' };
  }

  const [, startValue, endValue] = match;
  if (!startValue && !endValue) return { kind: 'unsatisfiable' };

  if (!startValue) {
    const suffixLength = parseDecimalInteger(endValue);
    if (suffixLength === null || suffixLength <= 0) return { kind: 'unsatisfiable' };

    return {
      kind: 'partial',
      start: Math.max(fileSize - suffixLength, 0),
      end: fileSize - 1,
    };
  }

  const start = parseDecimalInteger(startValue);
  if (start === null || start >= fileSize) return { kind: 'unsatisfiable' };

  if (!endValue) {
    return { kind: 'partial', start, end: fileSize - 1 };
  }

  const requestedEnd = parseDecimalInteger(endValue);
  if (requestedEnd === null || requestedEnd < start) return { kind: 'unsatisfiable' };

  return {
    kind: 'partial',
    start,
    end: Math.min(requestedEnd, fileSize - 1),
  };
}

function parseDecimalInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}
