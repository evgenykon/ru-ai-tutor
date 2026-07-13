declare module 'markdown-it' {
  class MarkdownIt {
    constructor(options?: { html?: boolean; breaks?: boolean; linkify?: boolean })
    render(text: string): string
  }
  export default MarkdownIt
}
