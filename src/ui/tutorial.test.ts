import { describe, expect, it } from 'vitest';
import { tutorialSteps } from './tutorial';

describe('tutorialSteps', () => {
  it('starts with Sushi saying hello and ends with a send-off', () => {
    const steps = tutorialSteps(false, 'panda');
    expect(steps[0].picture).toBe('sushi');
    expect(steps.at(-1)!.title).toBe("That's it!");
  });

  it('tells computers about the keys and phones about tapping', () => {
    const walking = (touch: boolean) => tutorialSteps(touch, 'panda').find((s) => s.title === 'Walking around')!.text;
    expect(walking(false)).toContain('arrow keys');
    expect(walking(true)).toContain('Tap');
    expect(walking(true)).not.toContain('arrow keys');
  });

  it('is the same length either way, so the dots match', () => {
    expect(tutorialSteps(true, 'panda')).toHaveLength(tutorialSteps(false, 'panda').length);
  });

  it('explains presents', () => {
    expect(tutorialSteps(true, 'panda').some((s) => s.title === 'Presents' && s.text.startsWith('Tap a friend'))).toBe(true);
  });

  it('says which animal Sushi is', () => {
    expect(tutorialSteps(false, 'fox')[0].text).toContain("I'm a fox");
  });
});
