export function UpdateFooter() {
  return (
    <footer className="update-footer">
      <p>
        Data from StatMando · Refresh with{" "}
        <code className="trend-chart-code">npm run update</code>
      </p>
      <p className="update-footer-sub">
        Weekly cron: <code className="trend-chart-code">./scripts/update.sh</code> — see script for
        crontab line
      </p>
    </footer>
  );
}
