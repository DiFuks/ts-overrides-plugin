### Step to reproduce:

1. Install dependencies
    ```bash
    yarn
    ```
2. Build plugin
    ```bash
    yarn build:plugin
    ```
3. Run build and type check
    ```bash
    yarn build:tspc # ✅ working
    yarn build:ts-loader # ✅ working
    yarn build:fork-ts # ✅ working
    yarn watch:tspc # ⛔️ not working
    yarn watch:ts-loader # ✅ working
    yarn watch:fork-ts # ⛔️ not working
    ```