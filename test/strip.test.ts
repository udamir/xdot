import { template as t } from "../src"

describe("without index", () => {
  it("should repeat string N times", () => {
    expect(t("{{~it.arr:x}}\n*\n{{~}}", { strip: false })({arr: Array(3)})).toEqual("*\n*\n*\n")
  })

  it("should concatenate items", () => {
    expect(t("{{~it.arr:x}}\n{{=x}}\n{{~}}", { strip: false })({arr: [1, 2, 3]})).toEqual("1\n2\n3\n")
  })
})

describe("conditionals", () => {
  const template = "{{?it.one < 2}}\n{{=it.one}}\n{{?}}\n{{=it.two}}"

  it("should evaluate condition and include template if valid", () => {
    expect(t(template, { strip: false })({one: 1, two: 2})).toEqual("1\n2")
  })

  it("should evaluate condition and do NOT include template if invalid", () => {
    expect(t(template, { strip: false })({one: 3, two: 2})).toEqual("2")
  })
})