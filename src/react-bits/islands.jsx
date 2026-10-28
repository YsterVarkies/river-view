// River View: React Bits components mounted as islands inside the static pages.
// Each island is an element with data-rb="<Component>" and its props as JSON, either in data-rb-props
// or in a child <script type="application/json">. Whatever the element holds before it mounts is the
// fallback for visitors without script (and, for the WebGL gallery, for pages opened straight from disk).
// Build: npm run build:react
import { createRoot } from 'react-dom/client';
import CurvedLoop from './components/CurvedLoop/CurvedLoop.jsx';
import CircularGallery from './components/CircularGallery/CircularGallery.jsx';
import DomeGallery from './components/DomeGallery/DomeGallery.jsx';
import CountUp from './components/CountUp/CountUp.jsx';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const fromDisk = window.location.protocol === 'file:';

const COMPONENTS = {
  CurvedLoop: props => <CurvedLoop {...props} speed={reduce ? 0 : props.speed} />,
  // WebGL cannot read photographs from a page opened as a file, so the fallback stays there.
  CircularGallery: props => (fromDisk ? null : <CircularGallery {...props} autoScroll={reduce ? 0 : props.autoScroll} intro={!reduce} />),
  DomeGallery: props => <DomeGallery {...props} />,
  CountUp: props => <CountUp {...props} duration={reduce ? 0.01 : props.duration} />,
};

function readProps(el) {
  try {
    if (el.dataset.rbProps) return JSON.parse(el.dataset.rbProps);
    const script = el.querySelector(':scope > script[type="application/json"]');
    return script ? JSON.parse(script.textContent) : {};
  } catch (err) {
    console.error('River View: bad props for', el, err);
    return null;
  }
}

function mount(el) {
  if (el.dataset.rbMounted) return;
  const render = COMPONENTS[el.dataset.rb];
  const props = readProps(el);
  if (!render || !props) return;
  const node = render(props);
  if (!node) return;
  el.dataset.rbMounted = 'true';
  el.classList.add('rb-live');
  createRoot(el).render(node);
}

// Galleries and loops wake up as they come near the screen.
const io = 'IntersectionObserver' in window
  ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        mount(entry.target);
      });
    }, { rootMargin: '600px 0px' })
  : null;

document.querySelectorAll('[data-rb]').forEach(el => (io ? io.observe(el) : mount(el)));

// The dome locks the page while a photograph is open; smooth scrolling has to pause with it.
let domeLocked = false;
new MutationObserver(() => {
  const locked = document.body.classList.contains('dg-scroll-lock');
  if (locked === domeLocked) return;
  domeLocked = locked;
  const lenis = window.RV && window.RV.lenis;
  if (lenis) (locked ? lenis.stop() : lenis.start());
}).observe(document.body, { attributes: true, attributeFilter: ['class'] });
