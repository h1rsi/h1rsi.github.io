class TypingAnimation {
    constructor(texts, elementSelector, cursorSelector) {
        this.texts = texts;
        this.textElement = document.querySelector(elementSelector);
        this.cursorElement = document.querySelector(cursorSelector);
        this.textIndex = 0;
        this.charIndex = 0;
        this.typingSpeed = 100;
        this.blinkSpeed = 500;
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    start() {
        if (!this.textElement || !this.cursorElement || this.texts.length === 0) {
            return;
        }

        if (this.reduceMotion) {
            this.textElement.textContent = this.texts[0];
            return;
        }

        setTimeout(() => this.type(), 700);
    }

    type() {
        if (this.charIndex < this.texts[this.textIndex].length) {
            this.textElement.textContent += this.texts[this.textIndex].charAt(this.charIndex);
            this.charIndex++;
            setTimeout(() => this.type(), this.typingSpeed);
        } else {
            this.blinkCursor();
        }
    }

    blinkCursor() {
        this.cursorElement.style.opacity = 1;
        setInterval(() => {
            this.cursorElement.style.opacity = this.cursorElement.style.opacity === '1' ? 0 : 1;
        }, this.blinkSpeed);
    }
}

class TrailEffect {
    constructor() {
        this.lastX = undefined;
        this.lastY = undefined;
        this.timeoutId = null;
        this.timeoutInactivity = 80;
        this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!this.reduceMotion) {
            document.addEventListener('pointermove', (event) => this.createTrail(event), { passive: true });
        }
    }

    createTrail(event) {
        if (document.body.classList.contains('game-mode')) {
            this.lastX = undefined;
            this.lastY = undefined;
            return;
        }

        const x = event.clientX;
        const y = event.clientY;

        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        if (this.lastX !== undefined && this.lastY !== undefined) {
            const trail = document.createElement('div');
            trail.classList.add('trail');

            const deltaX = x - this.lastX;
            const deltaY = y - this.lastY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;

            trail.style.width = `${distance}px`;
            trail.style.left = `${this.lastX}px`;
            trail.style.top = `${this.lastY}px`;
            trail.style.transform = `rotate(${angle}deg)`;
            trail.style.transformOrigin = '0 0';

            document.body.appendChild(trail);

            setTimeout(() => trail.remove(), 300);
        }

        this.lastX = x;
        this.lastY = y;

        this.timeoutId = setTimeout(() => {
            this.lastX = undefined;
            this.lastY = undefined;
        }, this.timeoutInactivity);
    }
}

class TinyCollectGame {
    constructor() {
        this.collectibles = [];
        this.active = false;
        this.spawnTimeout = null;
        this.collectRadius = 34;
        this.maxCollectibles = this.collectibleLimit();
        this.baseTailLength = 80;
        this.growthPerCollect = 38;
        this.growthRemaining = this.baseTailLength;
        this.baseColor = '#d16969';
        this.segmentFadeLength = 18;
        this.colorSegments = this.createBaseColorSegments();
        this.tones = [
            { className: '', color: '#d16969' },
            { className: 'warm', color: '#e6b07c' },
            { className: 'green', color: '#8fce90' },
            { className: 'cool', color: '#7aa7c7' },
        ];
        this.points = [];
        this.runId = 0;
        this.animationFrame = null;
        this.endAnimationFrame = null;
        this.endDuration = 520;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'snake-canvas';
        this.ctx = this.canvas.getContext('2d');

        document.body.appendChild(this.canvas);
        window.addEventListener('resize', () => this.handleResize(), { passive: true });
        document.addEventListener('visibilitychange', () => this.end(), { passive: true });

        this.resize();
    }

    start(x, y) {
        this.end();
        this.active = true;
        const runId = ++this.runId;

        this.maxCollectibles = this.collectibleLimit();
        const nearbyCollectibles = this.maxCollectibles > 3 ? 2 : 1;
        this.growthRemaining = this.baseTailLength;
        this.colorSegments = this.createBaseColorSegments();
        this.points = [{ x, y }];
        document.body.classList.add('game-mode');
        this.canvas.classList.add('is-visible');

        for (let i = 0; i < this.maxCollectibles; i++) {
            window.setTimeout(() => {
                if (runId === this.runId) {
                    this.spawnCollectible(x, y, i < nearbyCollectibles);
                }
            }, i * 90);
        }

        this.animate();
    }

    spawnCollectible(originX, originY, nearOrigin = false) {
        if (!this.active || this.collectibles.length >= this.maxCollectibles) {
            return;
        }

        const collectible = document.createElement('div');
        const tone = this.randomTone();

        collectible.className = ['collectible', tone.className].filter(Boolean).join(' ');
        collectible.dataset.color = tone.color;
        collectible.setAttribute('aria-hidden', 'true');

        const position = nearOrigin
            ? this.positionNear(originX, originY)
            : this.randomPosition();

        collectible.style.left = `${position.x}px`;
        collectible.style.top = `${position.y}px`;

        document.body.appendChild(collectible);
        this.collectibles.push(collectible);
    }

    resize() {
        if (!this.ctx) {
            return;
        }

        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = Math.floor(this.width * ratio);
        this.canvas.height = Math.floor(this.height * ratio);
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
        this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    handleResize() {
        this.resize();
        this.maxCollectibles = this.collectibleLimit();
        this.trimCollectibles();
    }

    collectibleLimit() {
        const isSmallScreen = window.matchMedia('(max-width: 700px)').matches;
        const isTouchFirst = window.matchMedia('(pointer: coarse)').matches;

        return isSmallScreen || isTouchFirst ? 3 : 6;
    }

    trimCollectibles() {
        while (this.collectibles.length > this.maxCollectibles) {
            const collectible = this.collectibles.pop();

            if (collectible) {
                collectible.remove();
            }
        }
    }

    randomTone() {
        return this.tones[Math.floor(Math.random() * this.tones.length)];
    }

    createBaseColorSegments() {
        return [{
            color: this.baseColor,
            length: 0,
            targetLength: this.baseTailLength,
        }];
    }

    positionNear(x, y) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 75 + Math.random() * 95;

        return this.clampPosition(
            x + Math.cos(angle) * distance,
            y + Math.sin(angle) * distance
        );
    }

    randomPosition() {
        return this.clampPosition(
            40 + Math.random() * (window.innerWidth - 80),
            40 + Math.random() * (window.innerHeight - 130)
        );
    }

    clampPosition(x, y) {
        return {
            x: Math.min(window.innerWidth - 30, Math.max(30, x)),
            y: Math.min(window.innerHeight - 90, Math.max(30, y)),
        };
    }

    updatePointer(x, y) {
        if (!this.active) {
            return;
        }

        const lastPoint = this.points[this.points.length - 1];

        if (!lastPoint) {
            this.points = [{ x, y }];
        } else {
            const movement = Math.hypot(x - lastPoint.x, y - lastPoint.y);

            if (movement > 2) {
                const growth = this.consumeGrowth(movement);

                this.points.push({ x, y });
                this.growColorSegments(growth);
                this.trimTailBy(movement - growth);
            }
        }

        this.tryCollect(x, y);
    }

    tryCollect(x, y) {
        if (!this.active) {
            return;
        }

        let collected = false;

        this.collectibles = this.collectibles.filter((collectible) => {
            const rect = collectible.getBoundingClientRect();
            const collectibleX = rect.left + rect.width / 2;
            const collectibleY = rect.top + rect.height / 2;
            const distance = Math.hypot(x - collectibleX, y - collectibleY);

            if (distance > this.collectRadius) {
                return true;
            }

            collected = true;
            this.growTail(collectible.dataset.color || this.baseColor);
            collectible.classList.add('is-collected');
            window.setTimeout(() => collectible.remove(), 260);
            return false;
        });

        if (collected) {
            this.queueSpawn(x, y);
        }
    }

    growTail(color) {
        this.growthRemaining += this.growthPerCollect;
        this.addColorSegment(color);
    }

    addColorSegment(color) {
        const frontSegment = this.colorSegments[0];

        if (frontSegment && frontSegment.color === color) {
            frontSegment.targetLength += this.growthPerCollect;
            return;
        }

        this.colorSegments.unshift({
            color,
            length: 0,
            targetLength: this.growthPerCollect,
        });
    }

    growColorSegments(distance) {
        let remaining = distance;

        for (const segment of this.colorSegments) {
            if (remaining <= 0) {
                return;
            }

            const missing = segment.targetLength - segment.length;
            const growth = Math.min(missing, remaining);

            segment.length += growth;
            remaining -= growth;
        }
    }

    queueSpawn(x, y) {
        window.clearTimeout(this.spawnTimeout);
        this.spawnTimeout = window.setTimeout(() => {
            while (this.active && this.collectibles.length < this.maxCollectibles) {
                this.spawnCollectible(x, y, Math.random() > 0.45);
            }
        }, 160);
    }

    animate() {
        if (!this.active) {
            return;
        }

        this.drawSnake();
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    drawSnake(opacity = 1) {
        if (!this.ctx) {
            return;
        }

        this.ctx.clearRect(0, 0, this.width, this.height);

        if (this.points.length === 0 || opacity <= 0) {
            return;
        }

        const head = this.points[this.points.length - 1];

        if (this.points.length > 1) {
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            this.drawColoredPath(this.points, 18, 0.18 * opacity);
            this.drawColoredPath(this.points, 7, 0.94 * opacity);
        }

        this.ctx.beginPath();
        this.ctx.arc(head.x, head.y, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = this.colorAtDistance(0, 0.96 * opacity);
        this.ctx.shadowColor = this.colorAtDistance(0, 0.55 * opacity);
        this.ctx.shadowBlur = 14;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }

    finish() {
        if (!this.active || this.points.length === 0) {
            this.end();
            return;
        }

        window.clearTimeout(this.spawnTimeout);

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this.endAnimationFrame) {
            cancelAnimationFrame(this.endAnimationFrame);
            this.endAnimationFrame = null;
        }

        this.active = false;
        this.runId++;
        document.body.classList.remove('game-mode');
        const endingCollectibles = this.collectibles;

        this.collectibles = [];
        endingCollectibles.forEach((collectible) => collectible.classList.add('is-ending'));
        window.setTimeout(() => {
            endingCollectibles.forEach((collectible) => collectible.remove());
        }, 300);

        const startPoints = this.copyPoints(this.points);
        const startLength = this.pathLength(startPoints);
        const startedAt = performance.now();

        const animateEnd = () => {
            const elapsed = performance.now() - startedAt;
            const progress = Math.min(elapsed / this.endDuration, 1);
            const easedProgress = this.easeOutCubic(progress);
            const visibleProgress = Math.min(progress / 0.82, 1);
            const opacity = 1 - (visibleProgress * visibleProgress);

            this.points = this.trimmedPoints(startPoints, startLength * easedProgress);
            this.drawSnake(opacity);

            if (progress >= 1) {
                this.endAnimationFrame = null;
                this.end();
                return;
            }

            this.endAnimationFrame = requestAnimationFrame(animateEnd);
        };

        this.endAnimationFrame = requestAnimationFrame(animateEnd);
    }

    drawColoredPath(points, width, alpha) {
        const distances = this.distancesFromHead(points);

        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = width;

        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            const gradient = this.ctx.createLinearGradient(start.x, start.y, end.x, end.y);

            gradient.addColorStop(0, this.colorAtDistance(distances[i], alpha));
            gradient.addColorStop(1, this.colorAtDistance(distances[i + 1], alpha));

            this.ctx.beginPath();
            this.ctx.moveTo(start.x, start.y);
            this.ctx.lineTo(end.x, end.y);
            this.ctx.strokeStyle = gradient;
            this.ctx.stroke();
        }
    }

    distancesFromHead(points) {
        const distances = new Array(points.length).fill(0);

        for (let i = points.length - 2; i >= 0; i--) {
            const current = points[i];
            const next = points[i + 1];

            distances[i] = distances[i + 1] + Math.hypot(next.x - current.x, next.y - current.y);
        }

        return distances;
    }

    copyPoints(points) {
        return points.map((point) => ({ x: point.x, y: point.y }));
    }

    pathLength(points) {
        let length = 0;

        for (let i = 1; i < points.length; i++) {
            const previous = points[i - 1];
            const current = points[i];

            length += Math.hypot(current.x - previous.x, current.y - previous.y);
        }

        return length;
    }

    trimmedPoints(points, distance) {
        const trimmed = this.copyPoints(points);
        let remaining = distance;

        while (remaining > 0 && trimmed.length > 1) {
            const tail = trimmed[0];
            const next = trimmed[1];
            const segmentLength = Math.hypot(next.x - tail.x, next.y - tail.y);

            if (segmentLength <= remaining) {
                trimmed.shift();
                remaining -= segmentLength;
                continue;
            }

            const progress = remaining / segmentLength;

            tail.x += (next.x - tail.x) * progress;
            tail.y += (next.y - tail.y) * progress;
            remaining = 0;
        }

        return trimmed;
    }

    easeOutCubic(progress) {
        return 1 - Math.pow(1 - progress, 3);
    }

    colorAtDistance(distance, alpha) {
        let offset = 0;

        for (let i = 0; i < this.colorSegments.length; i++) {
            const segment = this.colorSegments[i];
            const length = Math.max(0, segment.length);
            const nextSegment = this.colorSegments[i + 1];

            if (distance <= offset + length || i === this.colorSegments.length - 1) {
                const distanceIntoSegment = Math.max(0, distance - offset);
                const fadeLength = nextSegment
                    ? Math.min(this.segmentFadeLength, length / 2, nextSegment.length / 2)
                    : 0;

                if (nextSegment && fadeLength > 0 && distanceIntoSegment > length - fadeLength) {
                    const progress = (distanceIntoSegment - (length - fadeLength)) / fadeLength;

                    return this.withAlpha(this.mixHex(segment.color, nextSegment.color, progress), alpha);
                }

                return this.withAlpha(segment.color, alpha);
            }

            offset += length;
        }

        return this.withAlpha(this.baseColor, alpha);
    }

    mixHex(from, to, progress) {
        const fromRgb = this.hexToRgb(from);
        const toRgb = this.hexToRgb(to);
        const eased = progress * progress * (3 - 2 * progress);
        const red = Math.round(fromRgb.red + (toRgb.red - fromRgb.red) * eased);
        const green = Math.round(fromRgb.green + (toRgb.green - fromRgb.green) * eased);
        const blue = Math.round(fromRgb.blue + (toRgb.blue - fromRgb.blue) * eased);

        return `#${this.toHex(red)}${this.toHex(green)}${this.toHex(blue)}`;
    }

    withAlpha(color, alpha) {
        const rgb = this.hexToRgb(color);

        return `rgba(${rgb.red}, ${rgb.green}, ${rgb.blue}, ${alpha})`;
    }

    hexToRgb(color) {
        const value = parseInt(color.replace('#', ''), 16);

        return {
            red: (value >> 16) & 255,
            green: (value >> 8) & 255,
            blue: value & 255,
        };
    }

    toHex(value) {
        return value.toString(16).padStart(2, '0');
    }

    consumeGrowth(distance) {
        const consumed = Math.min(this.growthRemaining, distance);

        this.growthRemaining -= consumed;
        return consumed;
    }

    trimTailBy(distance) {
        let remaining = distance;

        while (remaining > 0 && this.points.length > 1) {
            const tail = this.points[0];
            const next = this.points[1];
            const segmentLength = Math.hypot(next.x - tail.x, next.y - tail.y);

            if (segmentLength <= remaining) {
                this.points.shift();
                remaining -= segmentLength;
                continue;
            }

            const progress = remaining / segmentLength;

            tail.x += (next.x - tail.x) * progress;
            tail.y += (next.y - tail.y) * progress;
            remaining = 0;
        }
    }

    end() {
        window.clearTimeout(this.spawnTimeout);

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this.endAnimationFrame) {
            cancelAnimationFrame(this.endAnimationFrame);
            this.endAnimationFrame = null;
        }

        this.active = false;
        this.runId++;
        document.body.classList.remove('game-mode');
        this.canvas.classList.remove('is-visible');

        this.collectibles.forEach((collectible) => collectible.remove());
        this.collectibles = [];
        this.points = [];
        this.growthRemaining = this.baseTailLength;
        this.colorSegments = this.createBaseColorSegments();

        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.width, this.height);
        }
    }
}

class HoldToGame {
    constructor() {
        this.loader = document.createElement('div');
        this.loader.className = 'hold-loader';
        this.chargeDelay = 650;
        this.duration = 1100;
        this.animationFrame = null;
        this.fillAnimationFrame = null;
        this.revealTimeout = null;
        this.completeTimeout = null;
        this.fillDuration = 260;
        this.shrinkDuration = 190;
        this.loaderRadius = 0;
        this.startedAt = 0;
        this.pointerDown = false;
        this.isCharging = false;
        this.isCompleting = false;
        this.activePointerId = null;
        this.x = 0;
        this.y = 0;
        this.moveTolerance = 9;
        this.game = new TinyCollectGame();

        document.body.appendChild(this.loader);
        this.updateLoaderMetrics();
        document.addEventListener('pointerdown', (event) => this.start(event), { passive: true });
        document.addEventListener('pointermove', (event) => this.move(event), { passive: true });
        document.addEventListener('pointerup', () => this.stop(), { passive: true });
        document.addEventListener('pointercancel', () => this.stop(), { passive: true });
        document.addEventListener('visibilitychange', () => this.stop(), { passive: true });
        window.addEventListener('resize', () => this.updateLoaderMetrics(), { passive: true });
    }

    start(event) {
        if (event.target instanceof Element && event.target.closest('a')) {
            return;
        }

        this.stop();
        this.pointerDown = true;
        this.activePointerId = event.pointerId;
        this.startedAt = performance.now();
        this.setPosition(event);
        this.queueCharge();
    }

    move(event) {
        if (!this.pointerDown || event.pointerId !== this.activePointerId) {
            return;
        }

        const distance = Math.hypot(event.clientX - this.x, event.clientY - this.y);
        this.setPosition(event);

        if (this.game.active) {
            this.game.updatePointer(this.x, this.y);
            return;
        }

        if (this.isCompleting) {
            return;
        }

        if (distance > this.moveTolerance) {
            this.cancelCharge();
            this.queueCharge();
        }
    }

    setPosition(event) {
        this.x = event.clientX;
        this.y = event.clientY;
        this.loader.style.left = `${this.x}px`;
        this.loader.style.top = `${this.y}px`;
    }

    updateLoaderMetrics() {
        const rect = this.loader.getBoundingClientRect();
        this.loaderRadius = rect.width / 2 || 27;
    }

    queueCharge() {
        window.clearTimeout(this.revealTimeout);
        this.revealTimeout = window.setTimeout(() => this.beginCharge(), this.chargeDelay);
    }

    beginCharge() {
        if (!this.pointerDown) {
            return;
        }

        this.startedAt = performance.now();
        this.isCharging = true;
        this.updateLoaderMetrics();
        this.loader.style.setProperty('--hold-fill-depth', '0px');
        this.loader.classList.add('is-visible');
        this.tick();
    }

    tick() {
        const elapsed = performance.now() - this.startedAt;
        const progress = Math.min(elapsed / this.duration, 1);

        this.loader.style.setProperty('--hold-progress', `${progress * 360}deg`);

        if (progress >= 1) {
            this.completeCharge();
            return;
        }

        this.animationFrame = requestAnimationFrame(() => this.tick());
    }

    cancelCharge() {
        window.clearTimeout(this.revealTimeout);
        window.clearTimeout(this.completeTimeout);

        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        if (this.fillAnimationFrame) {
            cancelAnimationFrame(this.fillAnimationFrame);
            this.fillAnimationFrame = null;
        }

        this.isCharging = false;
        this.isCompleting = false;
        this.loader.classList.remove('is-visible', 'is-complete', 'is-filling', 'is-shrinking');
        this.loader.style.setProperty('--hold-progress', '0deg');
        this.loader.style.setProperty('--hold-fill-depth', '0px');
    }

    stop() {
        const wasPlaying = this.game.active;

        this.cancelCharge();
        this.pointerDown = false;
        this.activePointerId = null;

        if (wasPlaying) {
            this.game.finish();
            return;
        }

        this.game.end();
    }

    completeCharge() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        this.isCharging = false;
        this.isCompleting = true;
        this.loader.style.setProperty('--hold-progress', '360deg');
        this.loader.style.setProperty('--hold-fill-depth', '0px');
        this.loader.classList.add('is-complete', 'is-filling');

        this.fillLoader();
    }

    startGame() {
        if (!this.pointerDown) {
            this.cancelCharge();
            return;
        }

        const x = this.x;
        const y = this.y;

        this.cancelCharge();
        this.game.start(x, y);
    }

    fillLoader() {
        if (this.fillAnimationFrame) {
            cancelAnimationFrame(this.fillAnimationFrame);
            this.fillAnimationFrame = null;
        }

        const startedAt = performance.now();

        const animateFill = () => {
            if (!this.pointerDown) {
                this.cancelCharge();
                return;
            }

            const elapsed = performance.now() - startedAt;
            const progress = Math.min(elapsed / this.fillDuration, 1);
            const easedProgress = this.ease(progress);
            const fillDepth = this.loaderRadius * easedProgress;

            this.loader.style.setProperty('--hold-fill-depth', `${fillDepth}px`);

            if (progress >= 1) {
                this.fillAnimationFrame = null;
                this.shrinkLoader();
                return;
            }

            this.fillAnimationFrame = requestAnimationFrame(animateFill);
        };

        this.fillAnimationFrame = requestAnimationFrame(animateFill);
    }

    shrinkLoader() {
        if (!this.pointerDown) {
            this.cancelCharge();
            return;
        }

        window.clearTimeout(this.completeTimeout);
        this.loader.classList.add('is-shrinking');
        this.completeTimeout = window.setTimeout(() => this.startGame(), this.shrinkDuration);
    }

    ease(progress) {
        return progress * progress * (3 - 2 * progress);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const typingAnimation = new TypingAnimation(
        ["Computer Science Student @ TU Graz"],
        '.typing-animation .text',
        '.typing-animation .cursor'
    );

    typingAnimation.start();

    new TrailEffect();
    new HoldToGame();
});
