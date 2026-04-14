import { motion, AnimatePresence } from "framer-motion";
import { ScrapedApp } from "@shared/schema";
import { ExternalLink, Building2, Mail, Globe, Trash2 } from "lucide-react";

interface ResultsTableProps {
  data: ScrapedApp[];
}

export function ResultsTable({ data }: ResultsTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-border/60">
        <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Globe className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No data yet</h3>
        <p className="text-muted-foreground max-w-sm mx-auto mt-2">
          Enter Google Play URLs above to scrape developer contact information.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-white overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
            <tr>
              <th className="px-6 py-4">Studio Name</th>
              <th className="px-6 py-4">Название игры</th>
              <th className="px-6 py-4">Support Email</th>
              <th className="px-6 py-4">Developer Email (About)</th>
              <th className="px-6 py-4">Website</th>
              <th className="px-6 py-4">Source</th>
              <th className="px-6 py-4">Downloads</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {data.map((app) => (
                <motion.tr
                  key={app.originalUrl}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="group hover:bg-muted/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <Building2 className="w-4 h-4 text-primary/70" />
                      {app.studioName || <span className="text-muted-foreground italic">Unknown</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-foreground font-medium">
                    {app.gameTitle || <span className="text-muted-foreground italic">Unknown</span>}
                  </td>
                  <td className="px-6 py-4">
                    {app.supportEmail ? (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <a href={`mailto:${app.supportEmail}`} className="hover:text-primary transition-colors hover:underline">
                          {app.supportEmail}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Not found</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {app.developerEmail ? (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary/60" />
                        <a href={`mailto:${app.developerEmail}`} className="hover:text-primary transition-colors hover:underline">
                          {app.developerEmail}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Not found</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {app.websiteUrl ? (
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-muted-foreground" />
                        <a 
                          href={app.websiteUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="hover:text-primary transition-colors hover:underline truncate max-w-[200px] block"
                        >
                          {app.websiteUrl}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic text-xs">Not found</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <a 
                      href={app.originalUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors text-xs break-all max-w-xs block"
                    >
                      {app.originalUrl}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-foreground font-medium">
                      {app.downloadCount || <span className="text-muted-foreground italic text-xs">Unknown</span>}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
}
