import { useState } from "react";
import { type ScrapedApp } from "@shared/schema";
import { ResultsTable } from "@/components/results-table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Download, Play, Trash2, Copy } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scrapedApps, setScrapedApps] = useState<ScrapedApp[]>([]);
  const { toast } = useToast();

  const handleProcess = async () => {
    const urls = input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (urls.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty input",
        description: "Please enter at least one URL",
      });
      return;
    }

    setProcessing(true);
    setProgress(0);

    let completed = 0;

    // Process sequentially to avoid rate limiting
    for (const url of urls) {
      try {
        const res = await fetch("/api/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({}));
          throw new Error((error as { message?: string }).message || "Failed to scrape URL");
        }

        const data: ScrapedApp = await res.json();
        setScrapedApps(prev => [...prev, data]);

        toast({
          title: "Success",
          description: `Processed ${data.studioName || "app"} successfully`,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to scrape URL";
        console.error(`Failed to scrape ${url}`, e);
        toast({
          variant: "destructive",
          title: "Error",
          description: message,
        });
      } finally {
        completed++;
        setProgress((completed / urls.length) * 100);
      }
    }

    setProcessing(false);
    setInput("");
    toast({
      title: "Batch complete",
      description: `Processed ${urls.length} URLs`,
    });
  };

  const handleExport = () => {
    if (scrapedApps.length === 0) return;

    const exportData = scrapedApps.map(app => ({
      studio_name: app.studioName,
      game_title: app.gameTitle,
      support_email: app.supportEmail,
      developer_email: app.developerEmail,
      website_url: app.websiteUrl,
      original_url: app.originalUrl,
      download_count: app.downloadCount,
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `play-store-scrape-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Data downloaded as JSON",
    });
  };

  const handleCopyToClipboard = () => {
    if (scrapedApps.length === 0) return;

    const exportData = scrapedApps.map(app => ({
      studio_name: app.studioName,
      game_title: app.gameTitle,
      support_email: app.supportEmail,
      developer_email: app.developerEmail,
      website_url: app.websiteUrl,
      original_url: app.originalUrl,
      download_count: app.downloadCount,
    }));

    navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));

    toast({
      title: "Copied",
      description: "Data copied to clipboard",
    });
  };

  return (
    <div className="min-h-screen bg-background p-6 md:p-12">
      {/* GitHub Corner */}
      <a
        href="https://github.com/OstinUA/Google-Play-Store-Scraper"
        target="_blank"
        rel="noreferrer"
        aria-label="View source on GitHub"
        className="fixed top-0 right-0 z-50"
      >
        <svg
          width="80"
          height="80"
          viewBox="0 0 250 250"
          className="fill-black text-white"
          aria-hidden="true"
        >
          <path d="M0,0 L115,115 L130,115 L142,142 L250,250 L250,0 Z" />
          <path
            d="M128.3,109.0 C113.8,99.7 119.0,89.6 119.0,89.6 C122.0,82.7 120.5,78.6 120.5,78.6 C119.2,72.0 123.4,76.3 123.4,76.3 C127.3,80.9 125.5,87.3 125.5,87.3 C122.9,97.6 130.6,101.9 134.4,103.2"
            className="fill-white"
            style={{ transformOrigin: "130px 106px" }}
          />
          <path
            d="M115.0,115.0 C114.9,115.1 118.7,116.5 119.8,115.4 L133.7,101.6 C136.9,99.2 139.9,98.4 142.2,98.6 C133.8,88.0 127.5,74.4 143.8,58.0 C148.5,53.4 154.0,51.2 159.7,51.0 C160.3,49.4 163.2,43.6 171.4,40.1 C171.4,40.1 176.1,42.5 178.8,56.2 C183.1,58.6 187.2,61.8 190.7,65.4 C194.3,69.0 197.4,73.1 199.8,77.4 C213.5,80.1 215.9,84.9 215.9,84.9 C212.4,93.1 206.6,96.0 205.0,96.6 C204.8,102.4 202.6,107.8 198.0,112.5 C181.6,128.9 168.0,122.5 157.4,114.1 C157.6,116.9 156.7,120.9 152.7,124.9 L141.0,136.5 C139.8,137.7 141.6,141.9 141.8,141.8 Z"
            className="fill-white"
          />
        </svg>
      </a>

      <div className="max-w-6xl mx-auto space-y-12">

        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground pb-2">
              Play Store Scraper
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Extract developer contact information directly from Google Play Store listings.
            </p>
          </motion.div>
        </div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="p-1 shadow-lg bg-white/50 backdrop-blur-sm border-primary/10">
            <div className="bg-background rounded-xl p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground uppercase tracking-wider">
                  Target URLs
                </label>
                <Textarea
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  className="min-h-[160px] font-mono text-sm resize-y border-border focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all rounded-xl p-4 leading-relaxed"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={processing}
                />
                <p className="text-xs text-muted-foreground flex justify-between">
                  <span>Enter one URL per line</span>
                  <span>{input.split('\n').filter(l => l.trim()).length} URLs detected</span>
                </p>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  onClick={handleProcess}
                  disabled={processing || !input.trim()}
                  className="h-12 px-8 rounded-xl font-semibold bg-primary hover:bg-primary/90 shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/15 transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0"
                >
                  {processing ? (
                    <>
                      <LoadingSpinner className="mr-2 text-white" />
                      Processing {Math.round(progress)}%
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 w-4 h-4 fill-current" />
                      Start Scraping
                    </>
                  )}
                </Button>
              </div>

              {/* Progress bar */}
              {processing && (
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
              )}
            </div>
          </Card>
        </motion.div>

        {/* Results Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Extracted Data</h2>
              <p className="text-muted-foreground text-sm">
                {scrapedApps.length} records found
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setScrapedApps([])}
                disabled={scrapedApps.length === 0 || processing}
                className="text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20 hover:border-destructive/30"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear
              </Button>
              <div className="h-6 w-px bg-border hidden md:block" />
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={scrapedApps.length === 0}
                className="hover:bg-primary/5 hover:text-primary hover:border-primary/20"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy JSON
              </Button>
              <Button
                onClick={handleExport}
                disabled={scrapedApps.length === 0}
                className="bg-foreground text-background hover:bg-foreground/90"
              >
                <Download className="w-4 h-4 mr-2" />
                Save Array
              </Button>
            </div>
          </div>

          <ResultsTable data={scrapedApps} />
        </motion.div>
      </div>
    </div>
  );
}
