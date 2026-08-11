# Automated QA

Run the complete non-destructive QA suite from the project root:

```powershell
npm run qa
```

For continuous feedback while editing:

```powershell
npm run qa:watch
```

The suite checks every non-Grad-School client page, local asset references,
duplicate HTML IDs, browser and server JavaScript syntax, permission middleware,
schedule reassignment behavior, and critical upload/export workflow wiring.

These checks do not write to the application database. Grad School pages and
modules are intentionally excluded until they are brought into the current UI
and API conventions.
