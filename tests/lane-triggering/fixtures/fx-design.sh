#!/usr/bin/env bash
# A screen that exists and looks like nothing in particular.
# Without this, the run directory is empty and the agent spends the turn
# working out what "this" is instead of reaching the design task at all.
mkdir -p app/views/dashboard app/assets/stylesheets
cat > app/views/dashboard/index.html.erb <<'ERB'
<div class="wrap">
  <h1>Dashboard</h1>
  <div class="cards">
    <div class="card"><span class="label">REVENUE</span><b><%= @revenue %></b></div>
    <div class="card"><span class="label">USERS</span><b><%= @users %></b></div>
    <div class="card"><span class="label">CHURN</span><b><%= @churn %></b></div>
  </div>
  <%= render "shared/table", rows: @rows %>
</div>
ERB
cat > app/assets/stylesheets/application.css <<'CSS'
:root { --bg: #ffffff; --fg: #111827; --muted: #6b7280; --radius: 8px; }
body { font-family: Inter, system-ui, sans-serif; background: var(--bg); color: var(--fg); }
.wrap { max-width: 1100px; margin: 0 auto; padding: 24px; }
.cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.card { border-radius: var(--radius); box-shadow: 0 1px 3px rgba(0,0,0,.08); padding: 16px; }
.label { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
CSS
