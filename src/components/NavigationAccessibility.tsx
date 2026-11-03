import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function NavigationAccessibility() {
  const { pathname } = useLocation()
  useEffect(() => {
    document.title = 'Classroom Survey'
    // Async routes may show a loading state before their heading arrives.
    const observer = new MutationObserver(ready)
    function ready() {
      const heading = document.querySelector<HTMLElement>('main h1')
      if (!heading) return
      document.title = `${heading.textContent} | Classroom Survey`
      // Do not interrupt someone who already started interacting while loading.
      if (document.activeElement === document.body) {
        heading.tabIndex = -1
        heading.focus()
      }
      observer.disconnect()
    }
    observer.observe(document.getElementById('root')!, {
      childList: true,
      subtree: true,
    })
    ready()
    return () => observer.disconnect()
  }, [pathname])
  return (
    <a className="skip-link" href="#main-content">
      Skip to main content
    </a>
  )
}
