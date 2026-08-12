const waitForPaint = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

export const printCurrentPage = async () => {
  await document.fonts?.ready
  await Promise.all(Array.from(document.images).map(image => image.complete
    ? Promise.resolve()
    : image.decode().catch(() => undefined)))
  await waitForPaint()
  window.print()
}
