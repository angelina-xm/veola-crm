/** Route → shell page title (topbar left). */
export function pageTitleForPath(pathname: string): string {
  if (pathname === "/dashboard" || pathname === "/") return "Dashboard";
  if (pathname === "/pipeline" || pathname.startsWith("/pipeline")) return "Pipeline";
  if (pathname.startsWith("/tasks")) return "Tasks";
  if (pathname.startsWith("/clients")) return "Clients";
  if (pathname.startsWith("/deals/closed")) return "Closed deals";
  if (pathname.startsWith("/analytics")) return "Analytics";
  if (pathname.startsWith("/team")) return "Team";
  if (pathname.startsWith("/settings")) return "Settings";
  return "Vexora";
}

export function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return label.slice(0, 2).toUpperCase() || "?";
}
