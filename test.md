# Markdown Renderer Test

This is a test file for the Chrome markdown renderer extension.

## Code Blocks

```python
def fibonacci(n):
    """Generate fibonacci sequence."""
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(10)))
```

```javascript
const greet = (name) => {
  return `Hello, ${name}!`;
};
```

## Math (LaTeX)

Inline math: The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$.

Display math:

$$
\int_0^\infty e^{-x^2} dx = \frac{\sqrt{\pi}}{2}
$$

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$

## Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Themes | Done | 7 presets |
| LaTeX | Done | KaTeX |
| Export | Done | PDF + HTML |
| Outline | Done | Collapsible |

## Task Lists

- [x] Markdown parsing
- [x] Theme system
- [x] LaTeX rendering
- [ ] More themes
- [ ] Custom fonts

## Blockquotes

> "The best way to predict the future is to invent it."
> — Alan Kay

## Links and Images

[Visit Example](https://example.com)

## Nested Headings

### Level 3 Heading

Some content under level 3.

#### Level 4 Heading

Content under level 4.

##### Level 5 Heading

Content under level 5.

### Another Level 3

Back up to level 3.

## Footnotes

This has a footnote[^1] and another[^2].

[^1]: First footnote content.
[^2]: Second footnote content.

---

*Italic*, **bold**, ~~strikethrough~~, and `inline code`.
