import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { installBrowserApi } from "./browserApi.js";
import App from "./App";

installBrowserApi();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
