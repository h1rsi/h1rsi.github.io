class TypingAnimation {
    constructor(texts, elementSelector, cursorSelector) {
        this.texts = texts;
        this.textElement = document.querySelector(elementSelector);
        this.cursorElement = document.querySelector(cursorSelector);
        this.textIndex = 0;
        this.charIndex = 0;
        this.typingSpeed = 100;
        this.deletingSpeed = 50;
        this.blinkSpeed = 500;
        this.typingComplete = false;
    }

    start() {
        setTimeout(() => this.type(), 2000);
    }

    type() {
        if (this.charIndex < this.texts[this.textIndex].length) {
            this.textElement.innerHTML += this.texts[this.textIndex].charAt(this.charIndex);
            this.charIndex++;
            setTimeout(() => this.type(), this.typingSpeed);
        } else {
            if (this.textIndex === 0) {
                setTimeout(() => this.deleteText(), 1000);
            } else {
                this.typingComplete = true;
                this.blinkCursor();
            }
        }
    }

    deleteText() {
        if (this.charIndex > 0) {
            this.textElement.innerHTML = this.textElement.innerHTML.slice(0, -1);
            this.charIndex--;
            setTimeout(() => this.deleteText(), this.deletingSpeed);
        } else {
            this.textIndex = 1;
            this.charIndex = 0;
            setTimeout(() => this.type(), 500);
        }
    }

    blinkCursor() {
        this.cursorElement.style.opacity = 1;
        setInterval(() => {
            this.cursorElement.style.opacity = (this.cursorElement.style.opacity == 1 ? 0 : 1);
        }, this.blinkSpeed);
    }
}

class TrailEffect {
    constructor() {
        this.lastX = undefined;
        this.lastY = undefined;
        this.timeoutId = null;
        this.timoutInactivity = 50; // Time in milliseconds to wait before resetting the last position
        document.addEventListener('mousemove', (event) => this.createTrail(event), { passive: false });
        document.addEventListener('touchmove', (event) => this.createTrail(event), { passive: false });
    }

    createTrail(event) {
        event.preventDefault();

        let x, y;
        if (event.touches) {
            x = event.touches[0].pageX;
            y = event.touches[0].pageY;
        } else {
            x = event.pageX;
            y = event.pageY;
        }

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
        }, this.timoutInactivity);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const typingAnimation = new TypingAnimation(
        ["Management", "Computer Science Student @ Tu Graz"],
        '.typing-animation .text',
        '.typing-animation .cursor'
    );
    
    typingAnimation.start();

    new TrailEffect();
});