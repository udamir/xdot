import { template as t } from "../src"

describe("array iteration", () => {
  describe("without index", () => {
    it("should repeat string N times", () => {
      const data = {arr: Array(3)}
      expect(t("{{~it.arr:x}}*{{~}}")(data)).toEqual("***")
      expect(t("{{~ it.arr:x }}*{{~}}")(data)).toEqual("***")
      expect(t("{{~ it.arr: x }}*{{~}}")(data)).toEqual("***")
      expect(t("{{~ it.arr :x }}*{{~}}")(data)).toEqual("***")
    })
  
    it("should concatenate items", () => {
      expect(t("{{~it.arr:x}}{{=x}}{{~}}")({arr: [1, 2, 3]})).toEqual("123")
    })
  })

  describe("with index", () => {
    it("should repeat string N times", () => {
      expect(t("{{~it.arr:x:i}}*{{~}}")({arr: Array(3)})).toEqual("***")
      expect(t("{{~ it.arr : x : i }}*{{~}}")({arr: Array(3)})).toEqual("***")
    })
  
    it("should concatenate indices", () => {
      expect(t("{{~it.arr:x:i}}{{=i}}{{~}}")({arr: Array(3)})).toEqual("012")
    })
  
    it("should concatenate indices and items", () => {
      expect(t("{{~it.arr:x:i}}{{?i}}, {{?}}{{=i}}:{{=x}}{{~}}")({arr: [10, 20, 30]})).toEqual("0:10, 1:20, 2:30")
    })
  
    it("should interpolate nested array even if the same index variable is used", () => {
      expect(t("{{~it.arr:x:i}}{{~x:y:j}}{{=y}}{{~}}{{~}}")({ arr: [[1, 2, 3],[4, 5, 6]] })).toEqual("123456")
    })
  })
  
  describe("iterables", () => {
    const set = new Set([1, 2, 3])
  
    describe("without index", () => {
      it("should repeat string N times", () => {
        expect(t("{{~it.arr:x}}*{{~}}")({arr: set.values()})).toEqual("***")
      })
  
      it("should concatenate items", () => {
        expect(t("{{~it.arr:x}}{{=x}}{{~}}")({arr: set.values()})).toEqual("123")
      })
    })
  
    describe("with index", () => {
      it("should repeat string N times", () => {
        expect(t("{{~it.arr:x:i}}*{{~}}")({arr: set.values()})).toEqual("***")
      })
  
      it("should concatenate indices", () => {
        expect(t("{{~it.arr:x:i}}{{=i}}{{~}}")({arr: set.values()})).toEqual("012")
      })
  
      it("should concatenate indices and items", () => {
        expect(t("{{~it.arr:x:i}}{{?i}}, {{?}}{{=i}}:{{=x}}{{~}}")({arr: set.values()})).toEqual("0:1, 1:2, 2:3")
      })
    })
  })
})

describe("object iteration", () => {
  const data = {obj: { a: 1, b: 2, c: 3}}
  it("should concatenate keys and values", () => {
    expect(t("{{~~it.obj:v:k}}{{=k}}={{=v}} {{~}}")(data)).toEqual("a=1 b=2 c=3 ")
    expect(t("{{~~ it.obj : v : k }}{{=k}}={{=v}} {{~}}")(data)).toEqual("a=1 b=2 c=3 ")
  })

  it("should concatenate values", () => {
    expect(t("{{~~it.obj:v}}{{=v}}{{~}}")(data)).toEqual("123")
  })

  it("should ingone white spaces", () => {
    expect(t("{{~~it.obj:v}}{{=v}}{{~}}\n  {{? it.obj}}0{{?}}")(data)).toEqual("1230")
  })
})

describe("handle wrong syntax", () => {
  it("should throw exception", () => {
    expect(() => t("{{~~~it.obj:v}}")).toThrowError()
    expect(() => t("{{~it.obj:}}")).toThrowError()
  })
})