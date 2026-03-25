import '@testing-library/jest-dom';

// Cesium uses browser APIs not available in jsdom — stub them out.
Object.defineProperty(window, 'WebGLRenderingContext', { value: undefined });
Object.defineProperty(window, 'WebGL2RenderingContext', { value: undefined });

// Suppress Cesium-specific console noise in tests.
const originalError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('Cesium') || msg.includes('WebGL')) return;
  originalError(...args);
};
