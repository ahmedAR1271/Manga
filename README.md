# Manga AI Reader

An AI-powered manga reading app built with [Next.js](https://nextjs.org) (App Router), TypeScript, and Tailwind CSS.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the app.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — create a production build
- `npm run start` — serve the production build
- `npm run lint` — run ESLint

## Project Structure

```
app/
  layout.tsx    # Root layout (fonts, metadata, global styles)
  page.tsx      # Homepage
  globals.css   # Tailwind CSS and theme variables
public/         # Static assets
```

## Deployment

The app is ready to deploy on [Vercel](https://vercel.com) with zero configuration — import the repository and Vercel will detect Next.js automatically.
