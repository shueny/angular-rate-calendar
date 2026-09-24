import { NagerHoliday } from '../../core/holiday/holiday.model';

function holiday(countryCode: string, date: string, name: string, localName = name): NagerHoliday {
  return {
    date,
    localName,
    name,
    countryCode,
    fixed: false,
    global: true,
    counties: null,
    launchYear: null,
    types: ['Public'],
  };
}

/**
 * Sample data for the simulated API, shaped like a Nager.Date response.
 * Only used by the "How it works" diagrams; the calendar calls the real API.
 */
export const SAMPLE_HOLIDAYS: Record<string, NagerHoliday[]> = {
  'US-2026': [
    holiday('US', '2026-01-01', "New Year's Day"),
    holiday('US', '2026-05-25', 'Memorial Day'),
    holiday('US', '2026-07-04', 'Independence Day'),
    holiday('US', '2026-09-07', 'Labor Day'),
    holiday('US', '2026-11-26', 'Thanksgiving Day'),
    holiday('US', '2026-12-25', 'Christmas Day'),
  ],
  'TW-2026': [
    holiday('TW', '2026-01-01', 'Republic Day', '開國紀念日'),
    holiday('TW', '2026-02-17', 'Lunar New Year', '春節'),
    holiday('TW', '2026-02-28', 'Peace Memorial Day', '和平紀念日'),
    holiday('TW', '2026-04-04', "Children's Day", '兒童節'),
    holiday('TW', '2026-05-01', 'Labour Day', '勞動節'),
    holiday('TW', '2026-06-19', 'Dragon Boat Festival', '端午節'),
    holiday('TW', '2026-09-25', 'Mid-Autumn Festival', '中秋節'),
    holiday('TW', '2026-10-10', 'National Day', '國慶日'),
  ],
};
