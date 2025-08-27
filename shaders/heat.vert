varying vec2 vUv;
varying vec4 vClipPosition;

void main() {
  vUv = uv;
  vClipPosition = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = vClipPosition;
}