precision highp isampler2D;
precision highp usampler2D;

uniform sampler2D drawMap;
uniform sampler2D textureMap;
uniform sampler2D maskMap;

uniform float blendVideo;
uniform float amount;
uniform float opacity;
uniform vec2 scale;
uniform vec2 offset;

uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
uniform vec3 color4;
uniform vec3 color5;
uniform vec3 color6;
uniform vec3 color7;
uniform vec4 blend;
uniform vec4 fade;
uniform vec4 maxBlend;

uniform float power;
uniform float rnd;
uniform vec4 heat;
uniform vec4 stretch;

varying vec2 vUv;
varying vec4 vClipPosition;

float adjustLevels(float value, float inBlack, float inWhite, float outBlack, float outWhite, float gamma) {
  float t = clamp((value - inBlack) / max(inWhite - inBlack, 1e-5), 0.0, 1.0);
  t = pow(t, gamma);
  return mix(outBlack, outWhite, t);
}

float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 linearRgbToLuminance(vec3 linearRgb){
  float finalColor = dot(linearRgb, vec3(0.2126729, 0.7151522, 0.0721750));
  return vec3(finalColor);
}

vec3 saturation(vec3 color, float saturation){
  return mix(linearRgbToLuminance(color), color, saturation);
}

vec3 gradient(float t) {
  float p1 = blend.x;
  float p2 = blend.y;
  float p3 = blend.z;
  float p4 = blend.w;
  float p5 = maxBlend.x;
  float p6 = maxBlend.y;

  float f1 = fade.x;
  float f2 = fade.y;
  float f3 = fade.z;
  float f4 = fade.w;
  float f5 = maxBlend.z;
  float f6 = maxBlend.w;

  float blend1 = smoothstep(p1 - f1 * 0.5, p1 + f1 * 0.5, t);
  float blend2 = smoothstep(p2 - f2 * 0.5, p2 + f2 * 0.5, t);
  float blend3 = smoothstep(p3 - f3 * 0.5, p3 + f3 * 0.5, t);
  float blend4 = smoothstep(p4 - f4 * 0.5, p4 + f4 * 0.5, t);
  float blend5 = smoothstep(p5 - f5 * 0.5, p5 + f5 * 0.5, t);
  float blend6 = smoothstep(p6 - f6 * 0.5, p6 + f6 * 0.5, t);

  vec3 color = color1;
  color = mix(color, color2, blend1);
  color = mix(color, color3, blend2);
  color = mix(color, color4, blend3);
  color = mix(color, color5, blend4);
  color = mix(color, color6, blend5);
  color = mix(color, color7, blend6);

  return color;
}

void main() {
  vec2 duv = vClipPosition.xy/vClipPosition.w;
  duv = 0.5 + duv * 0.5;

  vec2 uv = vUv;
  uv -= 0.5;
  uv /= scale;
  uv += 0.5;
  uv += offset;

  float o = clamp(opacity, 0.0, 1.0);
  float a = clamp(amount, 0.0, 1.0);
  float v = o * a;

  vec4 tex = texture2D(maskMap, uv + offset);
  float mask = tex.g;
  float logo = smoothstep(0.58, 0.6, 1.0-tex.b);

  vec2 wuv = uv;
  vec3 draw = texture2D(drawMap, duv).rgb;
  float heatDraw = draw.b;
  heatDraw *= mix(0.1, 1.0, mask);

  vec2 offset2 = draw.rg * 0.01;
  vec3 video = textureLod(textureMap, wuv + offset2, 0.0).rgb;

  float h = mix(pow(1.0-video.r, 1.5), 1.0, 0.2) * 1.25;
  heatDraw *= h;

  float map = video.r;
  map = pow(map, power);
  float msk = smoothstep(0.2, 0.5, uv.y);
  map = mix( map * 0.91, map, msk); 
  map = mix(0.0, map, v);
  
  float fade2 = distance(vUv, vec2(0.5, 0.52));
  fade2 = smoothstep(0.5, 0.62, 1.0-fade2);
  
  vec3 finalColor = gradient(map + heatDraw);
  finalColor = saturation(finalColor, 1.3);
  
  finalColor *= fade2;
  finalColor = mix(vec3(0.0), finalColor, a);

  gl_FragColor = vec4(finalColor, 1.0);
}