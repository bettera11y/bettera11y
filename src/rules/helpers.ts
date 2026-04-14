export function hasAccessibleName(element: Element): boolean {
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim().length > 0) {
    return true;
  }

  const ariaLabelledBy = element.getAttribute("aria-labelledby");
  if (ariaLabelledBy && ariaLabelledBy.trim().length > 0) {
    return true;
  }

  const title = element.getAttribute("title");
  if (title && title.trim().length > 0) {
    return true;
  }

  const text = element.textContent?.trim() ?? "";
  return text.length > 0;
}
