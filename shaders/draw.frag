precision highp float;

uniform float uDraw;
uniform vec3 uRadius;
uniform vec3 uResolution;
uniform vec2 uPosition;
uniform vec4 uDirection;
uniform float uSizeDamping;
uniform float uFadeDamping;
uniform sampler2D uTexture;

varying vec2 vUv;

void main() {
  float aspect = uResolution.x / uResolution.y;
  vec2 pos = uPosition;
  pos.y /= aspect;

  vec2 uv = vUv;
  uv.y /= aspect;
  
  float dist = distance(pos, uv) / (uRadius.z / uResolution.x);
  dist = smoothstep(uRadius.x, uRadius.y, dist);
  
  vec3 dir = uDirection.xyz * uDirection.w;
  vec2 offset = vec2((-dir.x) * (1.0-dist), (dir.y) * (1.0-dist));

  vec2 uvt = vUv;
  vec4 color = texture2D(uTexture, uvt + (offset * 0.01));

  color *= uFadeDamping;
 
  color.r += offset.x;
  color.g += offset.y;
  color.rg = clamp(color.rg, -1.0, 1.0);

  float d = uDraw;
  color.b += d * (1.0-dist);

  gl_FragColor = vec4(color.rgb, 1.0);
}