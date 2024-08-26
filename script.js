document.addEventListener('DOMContentLoaded', () => {
    const textElement = document.querySelector('.typing-animation .text');
    const cursorElement = document.querySelector('.typing-animation .cursor');
    const texts = [
        "Management",
        "Computer Science Student @ Tu Graz"
    ]; 
    let textIndex = 0; 
    let charIndex = 0; 
    const typingSpeed = 100; 
    const deletingSpeed = 50; 
    const blinkSpeed = 500; 
    let typingComplete = false;

    function type() {

        if (charIndex < texts[textIndex].length) {
            textElement.innerHTML += texts[textIndex].charAt(charIndex);
            charIndex++;
            setTimeout(type, typingSpeed);
        } else {
            if (textIndex === 0) {
                setTimeout(deleteText, 1000);
            } else {
                typingComplete = true;
                cursorElement.style.opacity = 1;
                setInterval(() => {
                    cursorElement.style.opacity = (cursorElement.style.opacity == 1 ? 0 : 1);
                }, blinkSpeed);
            }
        }
    }

    function deleteText() {
        if (charIndex > 0) {
            textElement.innerHTML = textElement.innerHTML.slice(0, -1);
            charIndex--;
            setTimeout(deleteText, deletingSpeed);
        } else {
            textIndex = 1;
            charIndex = 0;
            setTimeout(type, 500);
        }
    }

    function startTyping() {
        setTimeout(type,2000);
    }

    startTyping();
});