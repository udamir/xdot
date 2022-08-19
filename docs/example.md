Advanced templating: illustrates defines and includes.

Include external snippet defined in a variable:
```js
{{#def.externalsnippet}}

{{#def.externalsnippet:it.data}} //override external snippet data (it.data -> it)
```

Load external template from a file:
```js
{{#def.loadfile('/snippet.txt')}}
```

Load external template from a file and cache in a variable:
```js
{{#def['snippet.txt'] || (def['snippet.txt'] = def.loadfile('/snippet.txt'))}}
```

Use cached file again:
```js
{{#def['snippet.txt']}}
```

Here is a def block that will be used later. This snippet can be referenced from external templates too:
```js
{{##def.snippet1:
	Some snippet that will be included {{#def.a}} later {{=it.f1}}
#}}

{{#def.snippet1}} // Use of snippet1

{{# true && def.snippet1 }} // Include snippet1 if true
```

Runtime and Compile time evaluation used together:
```js
{{= it.f3 + {{#def.a + def.b}} }}
```

Include xyz or insert 'not found':
```js
{{#def.xyz || 'not found'}}
```

Set xyz to 1 and exclude result from output:
```js
{{##def.xyz=1#}} is identical to {{#(def.xyz=1) && ""}}
```

Compare xyz to 1, show 'xyz is not 1' if false:
```js
{{#def.xyz === 1 || 'xyz is not 1'}}

{{ if ({{#!def.abc}}) { }}
	{{#def.abc}} is falsy
{{ } }}

{{ if ({{#def.xyz === 1}}) { }}
	if(true) block
{{ } }}

{{##def.fntest = function() {
	return "Function test worked!";
}
#}}

{{#def.fntest()}}
```

Conditionals:
```js
{{? !it.altEmail }}
	<p>
	second email: {{= it.altEmail }}
	</p>
{{?? true }}
	else case worked
{{?}}
```

Array iterators
```js
{{~ it.farray :p }}
	<h1>{{=p.farray}}<h1>
	{{~ p.farray :value:i }}
		<h2>{{=i}}: {{=value}}</h2>
		{{~ value :w }}
			<h3>{{=w}}</h3>
		{{~}}
	{{~}}
{{~}}

{{~ ["apple", "banana", "orange"] :k}}
	{{=k}}
{{~}}

{{~ (function(){ return [1,2,3]})() :k}}
	{{=k}}
{{~}}
```

Inline Js function
```js
{{ function children(it) { }}

{{?it.Nodes.length}}
  <ul>
    {{~ it.Nodes :p}}
      <li>
        {{=p.title}}
        {{children(p);}}
      </li>
    {{~}}
  </ul>
{{?}}

{{ } }}

{{ children({ Nodes:[{ title:"1.1", Nodes: [{title:"1.1.1", Nodes:[]}, { title:"1.1.2", Nodes:[] }] }, { title:"1.2", Nodes:[] }, { title:"1.3", Nodes:[] }], title:"1" }) }}
```

Inline template definition
```js
{{##def.block:param:
	<div>{{=param}}</div>
#}}

{{##def.block1:param:
	<div>{{=param.a}}</div>
#}}

{{#(def.block:'text' || '') + def.block:5}}

{{#def.block:it.f3 || ''}}

{{#def.block:"lala tralala" || ''}}

{{#def.block1:{a:1, b:2} || ''}}

{{##def.testFunctionWithParam = function(str) {
    return "My name is: " + str;
  }
#}}

{{##def.mytestparam: {{=it.name}} #}}
{{#def.testFunctionWithParam(def.mytestparam)}}

{{#def.testFunctionWithParam("\{\{=it.name\}\}")}}

{{##def.testParamDef:myparam:
My name is: {{=myparam}}
#}}

{{#def.testParamDef:it.name}}
```