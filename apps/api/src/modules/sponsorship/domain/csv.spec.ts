import { toCsvTable } from './csv';

describe('toCsvTable', () => {
  it('joins headers and rows with commas and newlines', () => {
    const csv = toCsvTable(['Name', 'Goals'], [['Chuka Obi', '14']]);
    expect(csv).toBe('Name,Goals\nChuka Obi,14');
  });

  it('quotes a field containing a comma', () => {
    const csv = toCsvTable(['Note'], [['Lagos, Nigeria']]);
    expect(csv).toBe('Note\n"Lagos, Nigeria"');
  });

  it('doubles embedded quotes and wraps the field in quotes', () => {
    const csv = toCsvTable(['Note'], [['Say "hello"']]);
    expect(csv).toBe('Note\n"Say ""hello"""');
  });

  it('quotes a field containing a newline', () => {
    const csv = toCsvTable(['Note'], [['line one\nline two']]);
    expect(csv).toBe('Note\n"line one\nline two"');
  });

  it('leaves a plain field unquoted', () => {
    const csv = toCsvTable(['Name'], [['Ikorodu FC']]);
    expect(csv).toBe('Name\nIkorodu FC');
  });
});
