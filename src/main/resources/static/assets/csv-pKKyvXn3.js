function e(e){let t=e=>{let t=String(e??``);return(/^[\s]*[=+@-]/.test(t)||/^[\t\r\n]/.test(t))&&(t=`'`+t),`"`+t.replaceAll(`"`,`""`)+`"`};return e.map(e=>e.map(t).join(`,`)).join(`\r
`)+`\r
`}export{e as t};