import { Component } from 'react'
import './ErrorBoundary.css'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled interface error.', error, info)
  }

  goHome = () => {
    this.setState({ error: null })
    window.location.assign('/')
  }

  reload = () => {
    window.location.reload()
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <main className="app-error" role="alert">
        <p className="app-error__eyebrow">BYOC / Something went wrong</p>
        <h1 className="app-error__title">This page could not load.</h1>
        <p className="app-error__message">
          Your bag and wishlist are safe. Reload the page, or head back to the store.
        </p>
        <div className="app-error__actions">
          <button type="button" className="btn btn--lime" onClick={this.reload}>
            Reload the page
          </button>
          <button type="button" className="btn btn--outline" onClick={this.goHome}>
            Back to home
          </button>
        </div>
      </main>
    )
  }
}
