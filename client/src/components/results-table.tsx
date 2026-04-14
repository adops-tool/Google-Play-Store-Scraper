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
        <table className="w-full text-xs text-left">
          <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
            <tr>
              <th className="px-4 py-1.5">Studio Name</th>
              <th className="px-4 py-1.5">Название игры</th>
              <th className="px-4 py-1.5">Support Email</th>
              <th className="px-4 py-1.5">Developer Email (About)</th>
              <th className="px-4 py-1.5">Website</th>
              <th className="px-4 py-1.5">Source</th>
              <th className="px-4 py-1.5">Downloads</th>
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
                  <td className="px-4 py-1.5 max-w-[120px] md:max-w-[200px]">
                    <div className="flex items-center gap-1.5 font-medium text-foreground">
                      <Building2 className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                      {app.studioName ? (
                        <span className="truncate" title={app.studioName}>{app.studioName}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Unknown</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-1.5 max-w-[120px] md:max-w-[200px] text-foreground font-medium">
                    {app.gameTitle ? (
                      <span className="truncate block" title={app.gameTitle}>{app.gameTitle}</span>
                    ) : (
                      <span className="text-muted-foreground italic">Unknown</span>
                    )}
                  </td>
                  <td className="px-4 py-1.5 max-w-[120px] md:max-w-[200px]">
                    {app.supportEmail ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a
                          href={`mailto:${app.supportEmail}`}
                          className="truncate hover:text-primary transition-colors hover:underline"
                          title={app.supportEmail}
                        >
                          {app.supportEmail}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Not found</span>
                    )}
                  </td>
                  <td className="px-4 py-1.5 max-w-[120px] md:max-w-[200px]">
                    {app.developerEmail ? (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-primary/60 shrink-0" />
                        <a
                          href={`mailto:${app.developerEmail}`}
                          className="truncate hover:text-primary transition-colors hover:underline"
                          title={app.developerEmail}
                        >
                          {app.developerEmail}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Not found</span>
                    )}
                  </td>
                  <td className="px-4 py-1.5 max-w-[120px] md:max-w-[200px]">
                    {app.websiteUrl ? (
                      <div className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <a
                          href={app.websiteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate hover:text-primary transition-colors hover:underline"
                          title={app.websiteUrl}
                        >
                          {app.websiteUrl}
                        </a>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Not found</span>
                    )}
                  </td>
                  <td className="px-4 py-1.5 max-w-[120px] md:max-w-[200px]">
                    <a
                      href={app.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate block text-primary hover:text-primary/80 transition-colors"
                      title={app.originalUrl}
                    >
                      {app.originalUrl}
                    </a>
                  </td>
                  <td className="px-4 py-1.5">
                    <span className="text-foreground font-medium">
                      {app.downloadCount || <span className="text-muted-foreground italic">Unknown</span>}
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
