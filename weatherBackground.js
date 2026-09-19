/* Reusable canvas weather background. No dependencies. */

const WEATHER_BACKGROUND_CONFIG = {
    transitionMs: 1500,
    mobileParticleScale: 0.45,
    lowEndParticleScale: 0.3,
    maxDpr: 2,
    rain: { drizzle: 150, light: 200, heavy: 720 },
    snow: { light: 100, heavy: 500 },
    stars: 90,
    clouds: 8,
    windThreshold: 8,
    particleColors: { rain: '#9bd7ee', snow: '#ffffff', dust: '#e7bf85' }
};

const WEATHER_GRADIENTS = {
    sunny: ['#4facfe', '#87ceeb', '#e0f6ff'],
    night: ['#07152f', '#102d52', '#1b3150'],
    clouds: ['#9fc8dc', '#cbdde2', '#e9f1f0'],
    overcast: ['#66727b', '#8f9da2', '#c1cacc'],
    drizzle: ['#607e8b', '#8ea7ae', '#c4d5d6'],
    rain: ['#496b7d', '#6f8793', '#a9bdc4'],
    heavyRain: ['#182337', '#283a4e', '#47586a'],
    storm: ['#1c1932', '#302d49', '#4a465b'],
    snow: ['#b9d8e7', '#d9eaf0', '#f4fbff'],
    heavySnow: ['#899da8', '#bdcbd0', '#e7eef0'],
    mist: ['#aab9b7', '#c5cfcc', '#e0e5df'],
    smoke: ['#403a34', '#62584d', '#8b7763'],
    haze: ['#d8c796', '#e7d8b0', '#f4e9cb'],
    dust: ['#9b704c', '#c3955d', '#e1ba7c'],
    wind: ['#75a0a4', '#a8c4c5', '#d7e0d9']
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4;

function particleScale() {
    if (reducedMotion.matches) return 0.08;
    if (window.innerWidth < 700) return WEATHER_BACKGROUND_CONFIG.mobileParticleScale;
    if (isLowEnd) return WEATHER_BACKGROUND_CONFIG.lowEndParticleScale;
    return 1;
}

function randomBetween(min, max) { return min + Math.random() * (max - min); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function gradientFor(colors) { return `linear-gradient(135deg, ${colors.join(', ')})`; }

class WeatherEffect {
    constructor(manager, options = {}) {
        this.manager = manager;
        this.options = options;
        this.canvas = null;
        this.ctx = null;
        this.width = 0;
        this.height = 0;
        this.running = false;
        this.time = 0;
    }
    init(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.resize(); }
    start() { this.running = true; }
    stop() { this.running = false; }
    resize() { this.width = this.manager.width; this.height = this.manager.height; }
    update(dt) { this.time += dt; }
    draw() {}
    destroy() {}
    setGradient(colors) { this.manager.setGradient(colors); }
    fill(color) { this.ctx.fillStyle = color; this.ctx.fillRect(0, 0, this.width, this.height); }
}

class ParticleEffect extends WeatherEffect {
    constructor(manager, options = {}) {
        super(manager, options);
        this.particles = [];
        this.count = options.count || 0;
    }
    init(canvas) {
        super.init(canvas);
        const scaledCount = Math.max(4, Math.round(this.count * particleScale()));
        this.particles.length = scaledCount;
        for (let i = 0; i < scaledCount; i += 1) this.particles[i] = this.makeParticle(i);
    }
    makeParticle() { return { x: 0, y: 0, vx: 0, vy: 0, size: 1, alpha: .5, life: 0, maxLife: 1, phase: 0, rotation: 0 }; }
    reset(particle, initial = false) { particle.x = randomBetween(-40, this.width + 40); particle.y = initial ? randomBetween(-this.height, this.height) : randomBetween(-50, 0); }
    resize() { super.resize(); for (const particle of this.particles) this.reset(particle, true); }
    destroy() { this.particles.length = 0; }
}

class SunnyEffect extends WeatherEffect {
    init(canvas) { super.init(canvas); this.setGradient(this.options.isDay ? WEATHER_GRADIENTS.sunny : WEATHER_GRADIENTS.night); this.stars = []; for (let i = 0; i < WEATHER_BACKGROUND_CONFIG.stars; i += 1) this.stars.push({ x: Math.random(), y: Math.random() * .7, size: randomBetween(.5, 2), phase: Math.random() * 6.28 }); }
    draw() {
        const ctx = this.ctx;
        if (!this.options.isDay) {
            ctx.fillStyle = '#fff';
            for (const star of this.stars) { ctx.globalAlpha = .25 + Math.abs(Math.sin(this.time * .8 + star.phase)) * .65; ctx.beginPath(); ctx.arc(star.x * this.width, star.y * this.height, star.size, 0, 6.28); ctx.fill(); }
            ctx.globalAlpha = 1; ctx.fillStyle = '#e8f1ff'; ctx.shadowBlur = 30; ctx.shadowColor = '#b7d5ff'; ctx.beginPath(); ctx.arc(this.width * .78, this.height * .2, 30, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
            if (Math.sin(this.time * .12) > .97) { ctx.strokeStyle = '#d9efff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.width * .18, this.height * .22); ctx.lineTo(this.width * .34, this.height * .3); ctx.stroke(); }
            return;
        }
        const x = this.width * .78, y = this.height * .2, pulse = 1 + Math.sin(this.time * .45) * .04;
        const halo = ctx.createRadialGradient(x, y, 10, x, y, 190 * pulse); halo.addColorStop(0, 'rgba(255,242,170,.9)'); halo.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = halo; ctx.fillRect(0, 0, this.width, this.height);
        ctx.fillStyle = '#ffe29a'; ctx.shadowBlur = 28; ctx.shadowColor = '#ffd36b'; ctx.beginPath(); ctx.arc(x, y, 42 * pulse, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0;
    }
}

class CloudEffect extends WeatherEffect {
    init(canvas) { super.init(canvas); this.setGradient(this.options.variant === 'overcast' ? WEATHER_GRADIENTS.overcast : (this.options.isDay ? WEATHER_GRADIENTS.clouds : WEATHER_GRADIENTS.night)); const count = this.options.count || 4; this.clouds = []; for (let i = 0; i < count; i += 1) this.clouds.push({ x: randomBetween(-.2, 1), y: randomBetween(.12, .55), w: randomBetween(100, 280), h: randomBetween(35, 90), speed: randomBetween(4, 14) * (this.options.speed || 1), alpha: randomBetween(.35, .75), scale: randomBetween(.75, 1.25) }); }
    update(dt) { super.update(dt); for (const cloud of this.clouds) { cloud.x += (cloud.speed + this.manager.windSpeed * .55) * dt / Math.max(600, this.width); if (cloud.x > 1.2) cloud.x = -.25; } }
    draw() { const ctx = this.ctx; for (const cloud of this.clouds) { const x = cloud.x * this.width, y = cloud.y * this.height, w = cloud.w * cloud.scale, h = cloud.h * cloud.scale; ctx.globalAlpha = cloud.alpha; ctx.fillStyle = this.options.isDay ? '#f5fbfc' : '#526273'; ctx.filter = 'blur(8px)'; ctx.beginPath(); ctx.ellipse(x, y, w * .5, h * .35, 0, 0, 6.28); ctx.ellipse(x - w * .2, y - h * .2, w * .22, h * .45, 0, 0, 6.28); ctx.ellipse(x + w * .18, y - h * .12, w * .28, h * .5, 0, 0, 6.28); ctx.fill(); } ctx.filter = 'none'; ctx.globalAlpha = 1; }
}

class RainEffect extends ParticleEffect {
    init(canvas) { super.init(canvas); this.setGradient(this.options.intensity < .45 ? WEATHER_GRADIENTS.rain : WEATHER_GRADIENTS.heavyRain); for (const p of this.particles) { p.vy = randomBetween(520, 950) * (this.options.intensity || .5); p.vx = -randomBetween(50, 130) - this.manager.windSpeed * 8; p.size = randomBetween(14, 34) * (this.options.intensity + .5); p.alpha = randomBetween(.25, .72); this.reset(p, true); } }
    update(dt) { super.update(dt); for (const p of this.particles) { p.x += (p.vx) * dt; p.y += p.vy * dt; if (p.y > this.height + 40 || p.x < -80) this.reset(p); } }
    draw() { const ctx = this.ctx; ctx.lineWidth = 1.2; ctx.strokeStyle = WEATHER_BACKGROUND_CONFIG.particleColors.rain; for (const p of this.particles) { ctx.globalAlpha = p.alpha; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + p.vx * .018, p.y + p.size); ctx.stroke(); } ctx.globalAlpha = 1; }
}

class DrizzleEffect extends RainEffect { init(canvas) { this.options.intensity = .22; this.options.count = WEATHER_BACKGROUND_CONFIG.rain.drizzle; super.init(canvas); this.setGradient(WEATHER_GRADIENTS.drizzle); } }
class SnowEffect extends ParticleEffect {
    init(canvas) { super.init(canvas); this.setGradient(this.options.intensity > .55 ? WEATHER_GRADIENTS.heavySnow : WEATHER_GRADIENTS.snow); for (const p of this.particles) { p.size = randomBetween(2, this.options.intensity > .55 ? 9 : 6); p.vy = randomBetween(18, 65) * (p.size / 4); p.alpha = randomBetween(.4, .95); p.phase = Math.random() * 6.28; this.reset(p, true); } }
    update(dt) { super.update(dt); for (const p of this.particles) { p.y += p.vy * dt; p.x += (Math.sin(this.time * .7 + p.phase) * 12 + this.manager.windSpeed * 4) * dt; if (p.y > this.height + 10) this.reset(p); } }
    draw() { const ctx = this.ctx; ctx.fillStyle = WEATHER_BACKGROUND_CONFIG.particleColors.snow; for (const p of this.particles) { ctx.globalAlpha = p.alpha; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.28); ctx.fill(); } ctx.globalAlpha = 1; }
}

class ThunderstormEffect extends RainEffect {
    init(canvas) {
        super.init(canvas);
        this.setGradient(WEATHER_GRADIENTS.storm);
        this.nextLightning = 3;
        this.lightningAge = -1;
        this.lightningDuration = .3;
        this.bolt = [];
    }
    update(dt) {
        super.update(dt);
        this.nextLightning -= dt;
        if (this.nextLightning <= 0) {
            this.nextLightning += 3;
            this.lightningAge = 0;
            this.bolt = this.createLightningBolt();
            if (this.manager.onThunder) this.manager.onThunder();
        }
        if (this.lightningAge >= 0) {
            this.lightningAge += dt;
            if (this.lightningAge > this.lightningDuration) {
                this.lightningAge = -1;
                this.bolt.length = 0;
            }
        }
    }
    createLightningBolt() {
        const segments = [];
        const startX = randomBetween(this.width * .1, this.width * .9);
        const startY = randomBetween(-20, this.height * .12);
        const endY = randomBetween(this.height * .55, this.height * .9);
        const segmentCount = 10;
        let x = startX;
        let y = startY;
        const points = [{ x, y }];

        for (let index = 1; index <= segmentCount; index += 1) {
            x += randomBetween(-this.width * .08, this.width * .08);
            y = startY + ((endY - startY) * index) / segmentCount;
            points.push({ x, y });
        }

        for (let index = 1; index < points.length; index += 1) {
            segments.push({ from: points[index - 1], to: points[index], width: randomBetween(1.5, 3.5) });
            if (index > 2 && index < points.length - 2 && Math.random() > .55) {
                const branchStart = points[index];
                const branchEnd = {
                    x: branchStart.x + randomBetween(-this.width * .16, this.width * .16),
                    y: branchStart.y + randomBetween(this.height * .06, this.height * .18)
                };
                segments.push({ from: branchStart, to: branchEnd, width: randomBetween(.8, 1.8) });
            }
        }

        return segments;
    }
    draw() {
        super.draw();
        if (this.lightningAge < 0) return;

        const progress = this.lightningAge / this.lightningDuration;
        const pulse = Math.max(0, 1 - progress) * (.55 + Math.abs(Math.sin(this.lightningAge * 52)) * .45);
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(220,235,255,${pulse * .28})`;
        ctx.fillRect(0, 0, this.width, this.height);
        ctx.shadowBlur = 18;
        ctx.shadowColor = `rgba(178,220,255,${pulse})`;
        ctx.strokeStyle = `rgba(235,249,255,${pulse})`;
        ctx.lineCap = 'round';
        for (const segment of this.bolt) {
            ctx.lineWidth = segment.width;
            ctx.beginPath();
            ctx.moveTo(segment.from.x, segment.from.y);
            ctx.lineTo(segment.to.x, segment.to.y);
            ctx.stroke();
        }
        ctx.restore();
    }
}

class MistEffect extends WeatherEffect { init(canvas) { super.init(canvas); this.setGradient(WEATHER_GRADIENTS.mist); this.blobs = [0, 1, 2].map((i) => ({ x: Math.random(), y: .55 + i * .12, w: .7 + i * .2, speed: .01 + i * .006 })); } update(dt) { super.update(dt); for (const blob of this.blobs) blob.x = (blob.x + blob.speed * dt) % 1.4 - .2; } draw() { const ctx = this.ctx; ctx.filter = 'blur(25px)'; for (const blob of this.blobs) { ctx.globalAlpha = .14; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(blob.x * this.width, blob.y * this.height, blob.w * this.width, 70, 0, 0, 6.28); ctx.fill(); } ctx.filter = 'none'; ctx.globalAlpha = 1; } }
class SmokeEffect extends MistEffect { init(canvas) { super.init(canvas); this.setGradient(WEATHER_GRADIENTS.smoke); } draw() { super.draw(); this.ctx.fillStyle = 'rgba(202,120,58,.2)'; this.ctx.beginPath(); this.ctx.arc(this.width * .75, this.height * .2, 55, 0, 6.28); this.ctx.fill(); } }
class HazeEffect extends MistEffect { init(canvas) { super.init(canvas); this.setGradient(WEATHER_GRADIENTS.haze); } }
class DustEffect extends ParticleEffect { init(canvas) { super.init(canvas); this.setGradient(WEATHER_GRADIENTS.dust); for (const p of this.particles) { p.vx = randomBetween(40, 150); p.vy = randomBetween(-12, 12); p.size = randomBetween(1, 4); p.alpha = randomBetween(.2, .7); this.reset(p, true); } } update(dt) { super.update(dt); for (const p of this.particles) { p.x += (p.vx + this.manager.windSpeed * 9) * dt; p.y += p.vy * dt + Math.sin(this.time + p.x) * dt * 4; if (p.x > this.width + 20) this.reset(p); } } draw() { const ctx = this.ctx; ctx.fillStyle = WEATHER_BACKGROUND_CONFIG.particleColors.dust; for (const p of this.particles) { ctx.globalAlpha = p.alpha; ctx.fillRect(p.x, p.y, p.size * 2, p.size); } ctx.globalAlpha = 1; } }
class WindEffect extends WeatherEffect { init(canvas) { super.init(canvas); if (!this.options.overlay) this.setGradient(WEATHER_GRADIENTS.wind); this.lines = []; for (let i = 0; i < 30; i += 1) this.lines.push({ x: Math.random() * this.width, y: Math.random() * this.height, speed: randomBetween(300, 700) }); } update(dt) { super.update(dt); for (const line of this.lines) { line.x += (line.speed + this.manager.windSpeed * 20) * dt; if (line.x > this.width + 80) line.x = -80; } } draw() { const ctx = this.ctx; ctx.strokeStyle = 'rgba(255,255,255,.45)'; for (const line of this.lines) { ctx.beginPath(); ctx.moveTo(line.x, line.y); ctx.quadraticCurveTo(line.x + 30, line.y - 8, line.x + 70, line.y); ctx.stroke(); } } }

const EFFECTS = { sunny: SunnyEffect, clouds: CloudEffect, drizzle: DrizzleEffect, rain: RainEffect, storm: ThunderstormEffect, snow: SnowEffect, mist: MistEffect, smoke: SmokeEffect, haze: HazeEffect, dust: DustEffect, wind: WindEffect };

/** Convert an OpenWeatherMap response into the module's normalized input. */
function mapWeatherToEffect(apiResponse) {
    const weather = apiResponse?.weather?.[0] || {};
    const id = Number(weather.id || 800);
    const windSpeed = Number(apiResponse?.wind?.speed || 0);
    const icon = weather.icon || '';
    const sunrise = Number(apiResponse?.sys?.sunrise || 0) * 1000;
    const sunset = Number(apiResponse?.sys?.sunset || 0) * 1000;
    const isDay = icon ? icon.endsWith('d') : sunrise && sunset ? Date.now() >= sunrise && Date.now() < sunset : true;
    let condition = 'clouds';
    if (id === 800) condition = 'sunny';
    else if (id >= 200 && id <= 232) condition = 'storm';
    else if (id >= 300 && id <= 321) condition = 'drizzle';
    else if (id >= 500 && id <= 504 || id >= 520 && id <= 531) condition = 'rain';
    else if (id >= 600 && id <= 622) condition = 'snow';
    else if (id === 701) condition = 'mist';
    else if (id === 711) condition = 'smoke';
    else if (id === 721) condition = 'haze';
    else if ([731, 761].includes(id)) condition = 'dust';
    else if (id === 741) condition = 'mist';
    else if ([771, 781].includes(id)) condition = 'wind';
    const intensity = condition === 'rain' ? (id >= 502 || id >= 520 ? .85 : .4) : condition === 'snow' ? (id === 602 || id >= 621 ? .85 : .4) : condition === 'storm' ? .9 : .5;
    return { condition, isDay, windSpeed, intensity };
}

class WeatherBackgroundManager {
    constructor(options = {}) { this.options = options; this.canvas = null; this.ctx = null; this.effect = null; this.windOverlay = null; this.transition = null; this.width = 0; this.height = 0; this.dpr = 1; this.windSpeed = 0; this.frame = 0; this.lastTime = 0; this.paused = false; this.onThunder = options.onThunder || null; this.root = options.root || document.body; }
    init() {
        this.gradient = document.createElement('div'); this.gradient.className = 'weather-background-gradient';
        this.gradientNext = document.createElement('div'); this.gradientNext.className = 'weather-background-gradient-next';
        this.canvas = document.createElement('canvas'); this.canvas.id = 'weather-background-canvas';
        this.scrim = document.createElement('div'); this.scrim.className = 'weather-background-scrim';
        this.root.prepend(this.scrim); this.root.prepend(this.canvas); this.root.prepend(this.gradientNext); this.root.prepend(this.gradient);
        this.resizeHandler = () => this.resize(); this.visibilityHandler = () => { this.paused = document.hidden; if (!this.paused) { this.lastTime = performance.now(); this.loop(this.lastTime); } };
        window.addEventListener('resize', this.resizeHandler, { passive: true }); document.addEventListener('visibilitychange', this.visibilityHandler); this.resize(); this.loop(performance.now()); return this;
    }
    resize() { this.dpr = Math.min(window.devicePixelRatio || 1, WEATHER_BACKGROUND_CONFIG.maxDpr); this.width = window.innerWidth; this.height = window.innerHeight; this.canvas.width = this.width * this.dpr; this.canvas.height = this.height * this.dpr; this.canvas.style.width = `${this.width}px`; this.canvas.style.height = `${this.height}px`; this.ctx = this.canvas.getContext('2d'); this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); if (this.effect) this.effect.resize(); if (this.windOverlay) this.windOverlay.resize(); }
    setGradient(colors) { const background = gradientFor(colors); if (!this.hasGradient) { this.gradient.style.background = background; this.hasGradient = true; return; } this.gradientNext.style.background = background; this.gradientNext.style.opacity = '1'; this.gradient.style.opacity = '0'; [this.gradient, this.gradientNext] = [this.gradientNext, this.gradient]; }
    setWeather(weather = {}) { const normalized = { condition: 'clouds', isDay: true, windSpeed: 0, intensity: .5, ...weather }; this.windSpeed = Number(normalized.windSpeed) || 0; const Effect = EFFECTS[normalized.condition] || CloudEffect; const options = { ...normalized, count: this.countFor(normalized) }; const next = new Effect(this, options); next.init(this.canvas); if (this.transition?.from) this.disposeEffect(this.transition.from); this.transition = this.effect ? { from: this.effect, to: next, elapsed: 0 } : null; this.effect = next; this.effect.start(); if (this.windOverlay) this.disposeEffect(this.windOverlay); this.windOverlay = this.windSpeed >= WEATHER_BACKGROUND_CONFIG.windThreshold && normalized.condition !== 'wind' ? new WindEffect(this, { overlay: true }) : null; if (this.windOverlay) { this.windOverlay.init(this.canvas); this.windOverlay.start(); } this.root.classList.toggle('weather-background-night', !normalized.isDay); document.documentElement.style.setProperty('--weather-scrim', this.scrimValue(normalized)); }
    countFor(weather) { const base = weather.condition === 'rain' ? (weather.intensity > .55 ? WEATHER_BACKGROUND_CONFIG.rain.heavy : WEATHER_BACKGROUND_CONFIG.rain.light) : weather.condition === 'snow' ? (weather.intensity > .55 ? WEATHER_BACKGROUND_CONFIG.snow.heavy : WEATHER_BACKGROUND_CONFIG.snow.light) : weather.condition === 'drizzle' ? WEATHER_BACKGROUND_CONFIG.rain.drizzle : weather.condition === 'dust' ? 180 : weather.condition === 'clouds' ? ({ few: 4, scattered: 7, broken: 10, overcast: 14 }[weather.variant] || 4) : 0; return base; }
    scrimValue(weather) { return weather.condition === 'storm' || weather.condition === 'smoke' ? .16 : weather.condition === 'rain' || weather.condition === 'snow' ? .07 : 0; }
    drawEffect(effect, alpha) { this.ctx.save(); this.ctx.globalAlpha = alpha; effect.draw(); this.ctx.restore(); }
    loop(now) { if (this.paused) return; const dt = Math.min(.05, (now - this.lastTime) / 1000 || 0); this.lastTime = now; this.ctx.clearRect(0, 0, this.width, this.height); if (this.transition) { const transition = this.transition; transition.from.update(dt); transition.to.update(dt); transition.elapsed += dt; const progress = clamp(transition.elapsed / (WEATHER_BACKGROUND_CONFIG.transitionMs / 1000), 0, 1); this.drawEffect(transition.from, 1 - progress); this.drawEffect(transition.to, progress); if (progress >= 1) { this.disposeEffect(transition.from); this.transition = null; } } else if (this.effect) { this.effect.update(dt); this.drawEffect(this.effect, 1); } if (this.windOverlay) { this.windOverlay.update(dt); this.drawEffect(this.windOverlay, .72); } this.frame = requestAnimationFrame((time) => this.loop(time)); }
    disposeEffect(effect) { effect.stop(); effect.destroy(); }
    destroy() { cancelAnimationFrame(this.frame); window.removeEventListener('resize', this.resizeHandler); document.removeEventListener('visibilitychange', this.visibilityHandler); if (this.effect) this.disposeEffect(this.effect); if (this.transition?.from) this.disposeEffect(this.transition.from); if (this.windOverlay) this.disposeEffect(this.windOverlay); this.canvas?.remove(); this.gradient?.remove(); this.gradientNext?.remove(); this.scrim?.remove(); }
}

window.WeatherBackgroundManager = WeatherBackgroundManager;
window.mapWeatherToEffect = mapWeatherToEffect;
window.WEATHER_BACKGROUND_CONFIG = WEATHER_BACKGROUND_CONFIG;
window.WeatherEffects = { WeatherEffect, SunnyEffect, CloudEffect, DrizzleEffect, RainEffect, ThunderstormEffect, SnowEffect, MistEffect, SmokeEffect, HazeEffect, DustEffect, WindEffect };
