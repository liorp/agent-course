import { useState, useRef, useEffect } from 'react';

interface WalkthroughStep {
  lines: [number, number];
  annotation: string;
}

interface CodeWalkthroughProps {
  code: string;
  language: string;
  steps: WalkthroughStep[];
  title?: string;
}

export default function CodeWalkthrough({ code, language, steps, title }: CodeWalkthroughProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const codeRef = useRef<HTMLPreElement>(null);
  const step = steps[currentStep];
  const lines = code.split('\n');

  useEffect(() => {
    if (codeRef.current && step) {
      const firstHighlighted = codeRef.current.querySelector(`[data-line="${step.lines[0]}"]`);
      if (firstHighlighted) {
        firstHighlighted.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStep, step]);

  function handlePrev() {
    setCurrentStep(s => Math.max(0, s - 1));
    fireEvent(currentStep - 1);
  }

  function handleNext() {
    setCurrentStep(s => Math.min(steps.length - 1, s + 1));
    fireEvent(currentStep + 1);
  }

  function fireEvent(stepIndex: number) {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'walkthrough_step', {
        title: title || 'unknown',
        step: stepIndex,
        total: steps.length,
      });
    }
  }

  return (
    <div className="cw-container">
      {title && <div className="cw-title">{title}</div>}
      <div className="cw-body">
        <pre ref={codeRef} className="cw-code">
          <code>
            {lines.map((line, i) => {
              const lineNum = i + 1;
              const isHighlighted = step && lineNum >= step.lines[0] && lineNum <= step.lines[1];
              return (
                <div
                  key={i}
                  data-line={lineNum}
                  className={`cw-line ${isHighlighted ? 'cw-line-active' : ''}`}
                >
                  <span className="cw-line-num">{lineNum}</span>
                  <span className="cw-line-text">{line || ' '}</span>
                </div>
              );
            })}
          </code>
        </pre>
        {step && (
          <div className="cw-annotation">
            <div className="cw-annotation-text">{step.annotation}</div>
          </div>
        )}
      </div>
      <div className="cw-controls">
        <button onClick={handlePrev} disabled={currentStep === 0} className="cw-btn">
          ← Prev
        </button>
        <span className="cw-step-indicator">
          Step {currentStep + 1} of {steps.length}
        </span>
        <button onClick={handleNext} disabled={currentStep === steps.length - 1} className="cw-btn">
          Next →
        </button>
      </div>
    </div>
  );
}
