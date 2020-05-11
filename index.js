import acorn from "acorn";

export default async function (src, optionsOrCallback, callback = null) {
  const sourceString = String(src.toString());

  return typeof optionsOrCallback === "function"
    ? await falafel(sourceString, optionsOrCallback)
    : await falafel(sourceString, callback, optionsOrCallback);
}

async function falafel(src, callback, { parser = acorn, ...options } = {}) {
  const ast = parser.parse(src, options);
  const chunks = await walk({ node: ast, chunks: src.split(""), callback });
  const joinChunks = () => chunks.join("");
  return {
    chunks,
    toString: joinChunks,
    inspect: joinChunks,
  };
}

async function walk({ node, parent, chunks, callback = () => null } = {}) {
  await Promise.all(
    Object.keys(node)
      .filter((key) => node[key] && key !== "parent")
      .map(async function (key) {
        const childs = node[key]
          ? Array.isArray(node[key])
            ? node[key]
            : [node[key]]
          : [];

        await Promise.all(
          childs.map(async (child) => {
            if (typeof child.type === "string") {
              await walk({ node: child, parent: node, chunks, callback });
            }
          })
        );
      })
  );

  await callback({
    ...node,
    parent,
    source: () => chunks.slice(node.start, node.end).join(""),
    update: (string) => {
      chunks[node.start] = string;
      for (let i = node.start + 1; i < node.end; i++) {
        chunks[i] = "";
      }
    },
  });

  return chunks;
}
