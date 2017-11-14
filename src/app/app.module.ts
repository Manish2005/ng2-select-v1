import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';

import { HttpModule } from "@angular/http"

import { AppComponent } from './app.component';
import { SelectComponent } from './select/select';
import { HighlightPipe } from './select/select-pipes';
import { OffClickDirective } from './select/off-click';
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

@NgModule({
  declarations: [
    AppComponent,
    SelectComponent,
    HighlightPipe,
    OffClickDirective
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
