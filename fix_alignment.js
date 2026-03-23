const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

const targetRegex = /\.timeline\s*\{[\s\S]*?box-shadow: 0 2px 4px rgba\(0,0,0,0\.2\);\s*\}/;

const replacement = `.timeline {
    position: relative;
    padding-left: 32px;
}

.timeline::before {
    content: '';
    position: absolute;
    left: 15px;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background: linear-gradient(to bottom, var(--primary-color), rgba(139,195,74,0.3));
    border-radius: 2px;
}

.timeline-item {
    background: #fafcfa;
    border: 1px solid rgba(40,122,68,0.08);
    margin-bottom: 10px;
    padding: 13px 14px;
    border-radius: var(--radius-md);
    box-shadow: 0 1px 6px rgba(31,122,61,0.06);
    position: relative;
    transition: transform 0.2s, box-shadow 0.2s;
}

.timeline-item:last-child {
    margin-bottom: 0;
}

.timeline-item:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
}

.timeline-item::before {
    content: '';
    position: absolute;
    left: -24px;
    top: 18px;
    width: 12px;
    height: 12px;
    background: var(--primary-color);
    border: 2px solid white;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(31,122,61,0.3);
}`;

if (targetRegex.test(css)) {
    css = css.replace(targetRegex, replacement);
    fs.writeFileSync('style.css', css, 'utf8');
    console.log('Math-based centering applied.');
} else {
    console.log('Regex un-matched. Review script.');
}
