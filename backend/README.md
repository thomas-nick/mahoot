# Strapi Disc/Course Catalog + Typesense

Strapi comes with a full featured [Command Line Interface](https://docs.strapi.io/dev-docs/cli) (CLI) which lets you scaffold and manage your project in seconds.

### `develop`

Start your Strapi application with autoReload enabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-develop)

```
npm run develop
# or
yarn develop
```

### `start`

Start your Strapi application with autoReload disabled. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-start)

```
npm run start
# or
yarn start
```

### `build`

Build your admin panel. [Learn more](https://docs.strapi.io/dev-docs/cli#strapi-build)

```
npm run build
# or
yarn build
```

### Catalog import and indexing

1. Configure Typesense variables in `.env`:

```
TYPESENSE_HOST=localhost
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=xyz
```

2. Import source CSV data from the workspace root:

```
npm run import:courses
npm run import:discs
npm run import:disc-molds
npm run import:plastic-types
npm run import:disc-variants
```

3. Build or refresh the Typesense index:

```
npm run reindex:typesense
```

If you approve course submissions after the backend has already been running, run a one-time recovery sync:

```
npm run sync:approved-submissions
```

For disc submissions, run the parallel one-time recovery sync:

```
npm run sync:approved-disc-submissions
```

### Course layouts and holes (JSON template)

The `Course` content type now supports a `layouts` JSON field for hole-by-hole data shown in the `Layouts & Holes` tab on the course detail page.

In Strapi Admin:

1. Open a course record
2. Find the `layouts` field
3. Paste JSON in this shape (edit values as needed):

```json
[
  {
    "name": "Blue Tees",
    "holes": 18,
    "parTotal": 58,
    "distanceFtTotal": 6420,
    "distanceMTotal": 1957,
    "notes": "Main championship layout.",
    "holeDetails": [
      {
        "holeNumber": 1,
        "par": 3,
        "distanceFt": 325,
        "distanceM": 99,
        "notes": "Tunnel shot, late fade."
      },
      {
        "holeNumber": 2,
        "par": 4,
        "distanceFt": 540,
        "distanceM": 165,
        "notes": "OB left, safe miss right."
      }
    ]
  },
  {
    "name": "White Tees",
    "holes": 18,
    "parTotal": 56,
    "distanceFtTotal": 5710,
    "distanceMTotal": 1740,
    "holeDetails": []
  }
]
```

Tips:

- `layouts` should be a JSON array.
- `holeDetails` can be omitted or empty when unknown.
- `distanceFt` and `distanceM` are both optional; use either or both.
- The frontend will show graceful fallbacks for missing values.

4. Start Strapi:

```
npm run develop
```

### Notes

- Data source files are read from `../courses.csv` and `../merged_disc_golf_catalog - merged_disc_golf_catalog.csv.csv`.
- Variant source files are read from `../disc_molds.csv`, `../plastic_types.csv`, and `../disc_variants.csv`.
- Imports are idempotent and upsert by `externalId`.
- Only published records are indexed in Typesense.
- Import order for variants: disc molds -> plastic types -> disc variants.
- Starter CSV templates live in `backend/csv-templates/`. Copy them to the workspace root before importing.

## ⚙️ Deployment

Strapi gives you many possible deployment options for your project including [Strapi Cloud](https://cloud.strapi.io). Browse the [deployment section of the documentation](https://docs.strapi.io/dev-docs/deployment) to find the best solution for your use case.

```
yarn strapi deploy
```

## 📚 Learn more

- [Resource center](https://strapi.io/resource-center) - Strapi resource center.
- [Strapi documentation](https://docs.strapi.io) - Official Strapi documentation.
- [Strapi tutorials](https://strapi.io/tutorials) - List of tutorials made by the core team and the community.
- [Strapi blog](https://strapi.io/blog) - Official Strapi blog containing articles made by the Strapi team and the community.
- [Changelog](https://strapi.io/changelog) - Find out about the Strapi product updates, new features and general improvements.

Feel free to check out the [Strapi GitHub repository](https://github.com/strapi/strapi). Your feedback and contributions are welcome!

## ✨ Community

- [Discord](https://discord.strapi.io) - Come chat with the Strapi community including the core team.
- [Forum](https://forum.strapi.io/) - Place to discuss, ask questions and find answers, show your Strapi project and get feedback or just talk with other Community members.
- [Awesome Strapi](https://github.com/strapi/awesome-strapi) - A curated list of awesome things related to Strapi.

---

<sub>🤫 Psst! [Strapi is hiring](https://strapi.io/careers).</sub>
