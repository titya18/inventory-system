import cron from "node-cron";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { prisma } from "../lib/prisma";
import logger from "../utils/logger";

dayjs.extend(utc);
dayjs.extend(timezone);
const tz = "Asia/Phnom_Penh";

const MEF_URL = "https://data.mef.gov.kh/api/v1/realtime-api/exchange-rate?currency_id=USD";

async function syncExchangeRateFromMef(): Promise<void> {
    logger.info("Exchange rate sync: fetching from MEF...");

    const mefResponse = await fetch(MEF_URL, {
        signal: AbortSignal.timeout(15_000),
    });

    if (!mefResponse.ok) {
        throw new Error(`MEF API returned HTTP ${mefResponse.status}`);
    }

    const mefData: any = await mefResponse.json();

    const d0 = Array.isArray(mefData?.data) ? mefData.data[0] : mefData?.data;
    const candidates = [d0?.average, d0?.bid, d0?.ask, d0?.exchange_rate, d0?.rate];
    let rate: number | null = null;
    for (const c of candidates) {
        const n = Number(c);
        if (c !== undefined && c !== null && !isNaN(n) && n > 0) { rate = n; break; }
    }

    if (!rate) {
        throw new Error("Could not extract exchange rate from MEF API response");
    }

    const now = dayjs().tz(tz);
    const ts = new Date(Date.UTC(now.year(), now.month(), now.date(), now.hour(), now.minute(), now.second()));

    await prisma.exchangeRates.create({
        data: {
            amount: rate,
            createdAt: ts,
            updatedAt: ts,
        },
    });

    logger.info(`Exchange rate sync: saved 1 USD = ${rate} KHR (${now.format("YYYY-MM-DD HH:mm")})`);
}

// Runs every day at 08:00 Phnom Penh time (MEF typically updates overnight)
export const startExchangeRateSyncJob = () => {
    cron.schedule("0 8 * * *", async () => {
        try {
            await syncExchangeRateFromMef();
        } catch (error: any) {
            logger.error("Exchange rate sync job failed:", error?.message ?? error);
        }
    }, { timezone: tz });

    logger.info("Exchange rate auto-sync job scheduled: daily at 08:00 Asia/Phnom_Penh");
};
