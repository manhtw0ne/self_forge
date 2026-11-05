import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { t } = this.props;
    return <main className="auth-page"><section className="auth-card" role="alert">
      <h1>{t('Trang gặp sự cố')}</h1>
      <p style={{ margin: '1rem 0' }}>{t('Bạn có thể tải lại để thử khôi phục. Nội dung chưa được lưu có thể bị mất; bản nháp đã lưu trên tab vẫn được giữ.')}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}><button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
        {t('Tải lại trang')}
      </button>
      <a className="btn btn-secondary" href="/">{t('Về trang chủ')}</a></div>
    </section></main>;
  }
}

