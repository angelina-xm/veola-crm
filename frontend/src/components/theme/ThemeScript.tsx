/** Inline before paint — prevents theme flash */
export default function ThemeScript() {
  const script = `(function(){try{var k='vexora:theme';var m=localStorage.getItem(k);var d=m==='light'?false:m==='dark'?true:window.matchMedia('(prefers-color-scheme: dark)').matches;var t=d?'dark':'light';document.documentElement.setAttribute('data-theme',t);document.documentElement.classList.toggle('dark',d);}catch(e){document.documentElement.setAttribute('data-theme','dark');document.documentElement.classList.add('dark');}})();`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
