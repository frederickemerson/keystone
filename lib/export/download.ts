// Browser download of a file built in the page. Client only (uses the DOM).

export function downloadFile(filename: string, content: string | Uint8Array, type: string): void {
  const part: BlobPart = typeof content === 'string' ? content : new Uint8Array(content);
  const url = URL.createObjectURL(new Blob([part], { type }));
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    // Revoke after the click has been handled.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
