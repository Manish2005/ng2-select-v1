import { Component } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import * as _ from "lodash";
import { FormBuilder, FormGroup } from "@angular/forms"

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {

  items: Array<any> = new Array<any>();
  // currentValue: any = [];
  singleCurrentValue: string = "";
  formGroup: FormGroup;

  constructor(private httpClient: HttpClient, private fb: FormBuilder) { }

  ngOnInit() {
    this.formGroup = this.fb.group({
      "multiValue": [""],
      "singleValue": ""
    });

    // this.httpClient.get("http://localhost:10002/ancillary/v1/state")
    this.httpClient.get("https://restcountries.eu/rest/v2/all")
      .subscribe((data: Array<any>) => {
        this.items = data;
        this.formGroup.patchValue({ currentValue: ["AFG", "IND"] });
      });
  }

  private value: any = ['Athens'];
  private _disabledV: string = '0';
  private disabled: boolean = false;

  private get disabledV(): string {
    return this._disabledV;
  }

  private set disabledV(value: string) {
    this._disabledV = value;
    this.disabled = this._disabledV === '1';
  }

  public selected(value: any): void {
    debugger;
    console.log('Selected value is: ', value);
  }

  public removed(value: any): void {
    debugger;
    console.log('Removed value is: ', value);
  }

  public refreshValue(value: any): void {
    debugger;
    this.value = value;
  }

  public itemsToString(value: Array<any> = []): string {
    debugger;
    return value.map((item: any) => {
      return item.text;
    }).join(',');
  }
}
