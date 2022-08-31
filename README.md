# xDoT

<img alt="npm" src="https://img.shields.io/npm/v/xdot"> <img alt="npm" src="https://img.shields.io/npm/dm/xdot?label=npm"> <img alt="npm type definitions" src="https://img.shields.io/npm/types/xdot"> <img alt="GitHub" src="https://img.shields.io/github/license/udamir/xdot">

Small, fast and powerfull temlate engine - [online demo](https://udamir.github.io/xdot/)

This engine is based on [doT.js](https://github.com/olado/doT) by Laura Doktorova [@olado](http://twitter.com/olado)

### Differences from original package `dot@beta`:
- TypeScript syntax
- Arguments definition (inc. destructured) in tempalte: `{{:{foo,baz}=foo+baz}}`
- Nested templates with parameter supported: `{{##nested : {foo,baz} :foo+baz#}}`
- Recursion with nested templates supported
- Blocks `{{# -}}`, `{{? -}}`, `{{~ -}}` are not adding line breaks in template
- Object iteration supported: `{{~~it :value :key }}`
- Removed delimiter configuration globally via `SetDelimiters`
- Strip option is `false` by default
- Option `selfContained` removed. All encoders are self contained.
- Options `internalPrefix` and `encodersPrefix` are replaced by `varName` and `defsName`
- Jest tests instead of Mocha

## Features
- Runtime evaluation and interpolation
- Compile-time evaluation
- PartiNested templates support
- Conditionals support
- Array/Object iterators
- Control whitespace - strip or preserve
- Streaming friendly
- Typescript syntax support out of the box
- No dependencies, can be used in nodejs or browser

## Installation
```SH
npm install xdot --save
```

## Usage

### Nodejs
```ts
import { template } from 'xdot'

const t = template("<div>Hi {{=it.name}}!</div>\n<div>{{=it.age || ''}}</div>")

console.log(t({ name: "Jake", age: 31 }))
// <div>Hi Jake!</div>
// <div>31</div>
```

## Security considerations

xDoT allows arbitrary JavaScript code in templates, making it one of the most flexible and powerful templating engines. It means that xDoT security model assumes that you only use trusted templates and you don't use any user input as any part of the template, as otherwise it can lead to code injection.

It is strongly recommended to compile all templates to JS code as early as possible. Possible options:

- using xDoT as dev-dependency only and compiling templates to JS files, for example, as described above or using a custom script, during the build. This is the most performant and secure approach and it is strongly recommended.
- if the above approach is not possible for some reason (e.g. templates are dynamically generated using some run-time data), it is recommended to compile templates to in-memory functions during application start phase, before any external input is processed.
- compiling templates lazily, on demand, is less safe. Even though the possibility of the code injection via prototype pollution was patched (#291), there may be some other unknown vulnerabilities that could lead to code injection.

## Contributing
When contributing, keep in mind that it is an objective of `xdot` to have no package dependencies. This may change in the future, but for now, no-dependencies.

Please run the unit tests before submitting your PR: `npm test`. Hopefully your PR includes additional unit tests to illustrate your change/modification!

## License

MIT
