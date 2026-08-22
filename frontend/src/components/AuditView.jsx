import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function AuditView() {
  const { state } = useAppContext();
  if (state.activeView !== 'tab-audit') return null;

  return (
    <section className="tab-pane active">
      <div className="content-wrapper">
        <div className="empty-state">
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Audit log coming in later phases.</p>
        </div>
      </div>
    </section>
  );
}
