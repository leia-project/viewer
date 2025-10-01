import { FeatureInfoRecord } from "./feature-info-record.js";

export class FeatureInfo {
  public id: string;
  public title: string;
  public records: Array<FeatureInfoRecord>;
  public location: Array<number> | undefined;

  constructor(
    id: string,
    title: string,
    records: Array<FeatureInfoRecord> = new Array<FeatureInfoRecord>(),
    location: Array<number> | undefined = undefined
  ) {
    this.id = id;
    this.title = title;
    this.records = records;
    this.location = location;
  }
}
