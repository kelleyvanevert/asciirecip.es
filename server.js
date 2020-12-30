const fs = require("fs");
const path = require("path");
const express = require("express");
const matter = require("gray-matter");

const app = express();

app.get("/", (req, res) => {
  fs.readFile(
    path.join(__dirname, "content", "home"),
    "utf8",
    (err, filecontents) => {
      if (err) {
        res.status(404).send("Not found");
      } else {
        res.send(render(matter(filecontents)));
      }
    }
  );
});

app.get("/recipe/:slug", (req, res) => {
  fs.readFile(
    path.join(__dirname, "content", "recipes", req.params.slug),
    "utf8",
    (err, filecontents) => {
      if (err) {
        res.status(404).send("Not found");
      } else {
        res.send(render(matter(filecontents)));
      }
    }
  );
});

module.exports = app;

function render({ data: { title, links = [] }, content }) {
  for (const { text, to, color = "black" } of links) {
    content = content.replace(
      text,
      `<a href="${to}" style="--color: ${color}">${text}</a>`
    );
  }

  content = ("\n" + content.trim() + "\n")
    .split("\n")
    .map((line) => "  " + line + "  ")
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
    @font-face {
      font-family: "DejaVu Sans Mono";
      src: local("DejaVu Sans Mono"), url("/static/DejaVuSansMono.ttf") format("ttf");
      font-weight: normal;
    }
    @font-face {
      font-family: "DejaVu Sans Mono";
      src: local("DejaVu Sans Mono Bold"), url("/static/DejaVuSansMono-Bold.ttf") format("ttf");
      font-weight: bold;
    }
    html, body, pre {
      margin: 0;
      padding: 0;
      font-family: "DejaVu Sans Mono";
      font-size: 14px;
      line-height: 128%;
      color: #333;
    }
    a {
      font-weight: bold;
      text-decoration: none;
      color: var(--color);
      margin: -2px;
      padding: 2px;
    }
    </style>
  </head>
  <body>
    <code><pre>${content}</pre></code>
  </body>
</html>
`;
}
