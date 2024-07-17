import { FeatureInfoRecord } from "./feature-info-record.js";

export class FeatureInfo {
  public title: string;
  public records: Array<FeatureInfoRecord>;
  public location: Array<number>;

  constructor(
    title: string,
    records: Array<FeatureInfoRecord> = new Array<FeatureInfoRecord>(),
    location: Array<number> = undefined
  ) {
    this.title = title;
    this.records = records;
    this.location = location;
  }
}
