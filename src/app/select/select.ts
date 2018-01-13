import { Component, Input, Output, EventEmitter, ElementRef, OnInit, forwardRef, OnChanges, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as _ from 'lodash';

import { SelectItem } from './select-item';
import { stripTags } from './select-pipes';
import { OptionsBehavior } from './select-interfaces';
import { escapeRegexp } from './common';
import { ChildrenBehavior, GenericBehavior } from './behavior';

@Component({
  selector: 'ng-select',
  styleUrls: ['./style.css'],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => SelectComponent),
    multi: true
  }],
  templateUrl: './select.template.html'
})
export class SelectComponent implements OnInit, ControlValueAccessor, OnChanges {

  @Output() public data: EventEmitter<any> = new EventEmitter();
  @Output() public selected: EventEmitter<any> = new EventEmitter();
  @Output() public removed: EventEmitter<any> = new EventEmitter();
  @Output() public typed: EventEmitter<any> = new EventEmitter();
  @Output() public opened: EventEmitter<any> = new EventEmitter();

  public options: Array<SelectItem> = [];
  public _options: Array<SelectItem> = [];
  public activeOption: SelectItem;
  public element: ElementRef;
  public selectedActiveItems: Array<SelectItem> = [];

  protected onChange: any = Function.prototype;
  protected onTouched: any = Function.prototype;

  public inputMode = false;
  private _optionsOpened = false;
  private behavior: OptionsBehavior;
  public inputValue = '';
  private _disabled = false;
  private _active: Array<SelectItem> = [];

  @Input() public allowClear = false;
  @Input() public placeholder = '';
  @Input() public idField: string;
  @Input() public textField: string;
  @Input() public childrenField = 'children';
  @Input() public multiple = false;
  @Input('items') items: any;

  @Input('ngModel') ngModel: any;
  @Input('ngModelChange') ngModelChange = new EventEmitter<any>();

  @Input()
  public set disabled(value: boolean) {
    this._disabled = value;
    if (this._disabled === true) {
      this.hideOptions();
    }
  }

  public get disabled(): boolean {
    return this._disabled;
  }

  @Input()
  public set active(selectedItems: any) {
    if ((typeof selectedItems === 'string' && selectedItems.length) ||
      (selectedItems && typeof selectedItems === 'object' && !Array.isArray(selectedItems) && Object.keys(selectedItems).length)) {
      selectedItems = [selectedItems];
    }
    if (!selectedItems || selectedItems.length === 0) {
      this._active = [];
    } else {
      this._active = selectedItems;
    }
  }

  public get active(): any {
    return this._active;
  }

  public set optionsOpened(value: boolean) {
    this._optionsOpened = value;
    this.opened.emit(value);
  }

  public get optionsOpened(): boolean {
    return this._optionsOpened;
  }

  public constructor(element: ElementRef, private sanitizer: DomSanitizer) {
    this.element = element;
    this.clickedOutside = this.clickedOutside.bind(this);
  }

  public ngOnInit(): any {
    this.behavior = (this.firstItemHasChildren) ?
      new ChildrenBehavior(this) : new GenericBehavior(this);

    this.ngModelChange.emit(this.ngModel);
  }

  ngOnChanges(changes: SimpleChanges): void {

    if (changes.items) {
      const items: any = changes.items.currentValue;
      this._options = this.options = [];

      if (items && items.length) {
        items.forEach(item => {
          if ((typeof item === 'string') || (typeof item === 'object' && item &&
            _.get(item, this.textField) &&
            _.get(item, this.idField))) {
            const newRec = {
              id: _.get(item, this.idField),
              text: _.get(item, this.textField)
            };
            this.options.push(new SelectItem(newRec));
          }
        });
      }

      _.each(this.selectedActiveItems, (row) => {
        if (!_.includes(this.options, r => r.id === row.id)) {
          this.options.push(_.cloneDeep(row));
        }
      });
    }
  }

  public sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html) || '';
  }

  public inputEvent(e: any, isUpMode: boolean = false): void {

    // tab
    if (e.keyCode === 9) {
      return;
    }
    if (isUpMode && (e.keyCode === 37 || e.keyCode === 39 || e.keyCode === 38 ||
      e.keyCode === 40 || e.keyCode === 13)) {
      e.preventDefault();
      return;
    }
    // backspace
    if (!isUpMode && e.keyCode === 8) {
      const el: any = this.element.nativeElement.querySelector('div.ui-select-container > input');
      if (!el.value || el.value.length <= 0) {
        if (this.active.length > 0) {
          this.remove(this.active[this.active.length - 1]);
        }
        e.preventDefault();
      }
    }
    // esc
    if (!isUpMode && e.keyCode === 27) {
      this.hideOptions();
      this.element.nativeElement.children[0].focus();
      e.preventDefault();
      return;
    }
    // del
    if (!isUpMode && e.keyCode === 46) {
      if (this.active.length > 0) {
        this.remove(this.active[this.active.length - 1]);
      }
      e.preventDefault();
    }
    // left
    if (!isUpMode && e.keyCode === 37 && this.options.length) {
      this.behavior.first();
      e.preventDefault();
      return;
    }
    // right
    if (!isUpMode && e.keyCode === 39 && this.options.length) {
      this.behavior.last();
      e.preventDefault();
      return;
    }
    // up
    if (!isUpMode && e.keyCode === 38) {
      this.behavior.prev();
      e.preventDefault();
      return;
    }
    // down
    if (!isUpMode && e.keyCode === 40) {
      this.behavior.next();
      e.preventDefault();
      return;
    }
    // enter
    if (!isUpMode && e.keyCode === 13) {
      if (this.active.indexOf(this.activeOption) === -1) {
        this.selectActiveMatch();
        this.behavior.next();
      }
      e.preventDefault();
      return;
    }
    if (this.inputValue) {

      this.behavior.filter(new RegExp(escapeRegexp(this.inputValue), 'ig'));
      this.doEvent('typed', this.inputValue);
    } else {
      this.open();
    }
  }

  public remove(item: SelectItem): void {

    if (this._disabled === true) {
      return;
    }
    if (this.multiple === true && this.active) {
      const index = this.active.indexOf(item);
      this.active.splice(index, 1);

      const _index = this.selectedActiveItems.indexOf(item);
      this.selectedActiveItems.splice(_index, 1);

      this.data.next(this.active);
      this.doEvent('removed', item);
    }
    if (this.multiple === false) {
      this.active = [];
      this.data.next(this.active[0]);
      this.doEvent('removed', item);
    }
  }

  public doEvent(type: string, value: any): void {

    if ((this as any)[type] && value) {
      if (value.id) {
        (this as any)[type].next(value.id);
      } else {
        (this as any)[type].next(value);
      }

    }
    this.onTouched();
    if (type === 'selected' || type === 'removed') {
      let val;
      if (this.multiple) {
        val = this.active;
      } else {
        val = this.active.length ? this.active[0] : '';
      }
      this.onChange(val);
    }
  }

  public clickedOutside(): void {
    this.inputMode = false;
    this.optionsOpened = false;
    this.inputValue = '';
    this.options = this._options;
  }

  public get firstItemHasChildren(): boolean {
    return this.options[0] && this.options[0].hasChildren();
  }

  public writeValue(val: any): void {
    this.active = val;
    if (this.multiple) {
      this.data.emit(this.active);
    } else {
      this.data.next(this.active.length ? this.active[0] : '');
    }
  }

  public registerOnChange(fn: (_: any) => {}): void { this.onChange = fn; }
  public registerOnTouched(fn: () => {}): void { this.onTouched = fn; }

  protected matchClick(e: any): void {
    if (this._disabled === true) {
      return;
    }
    this.inputMode = !this.inputMode;
    if (this.inputMode === true && ((this.multiple === true && e) || this.multiple === false)) {
      this.focusToInput();
      this.open();
    }
  }

  protected mainClick(event: any): void {

    if (this.inputMode === true || this._disabled === true) {
      return;
    }
    if (event.keyCode === 46) {
      event.preventDefault();
      this.inputEvent(event);
      return;
    }
    if (event.keyCode === 8) {
      event.preventDefault();
      this.inputEvent(event, true);
      return;
    }
    if (event.keyCode === 9 || event.keyCode === 13 ||
      event.keyCode === 27 || (event.keyCode >= 37 && event.keyCode <= 40)) {
      event.preventDefault();
      return;
    }
    this.inputMode = true;
    const value = String
      .fromCharCode(96 <= event.keyCode && event.keyCode <= 105 ? event.keyCode - 48 : event.keyCode)
      .toLowerCase();
    this.focusToInput(value);
    this.open();
    const target = event.target || event.srcElement;
    target.value = value;
    this.inputEvent(event);
  }

  // Highlight option which has focus in the list
  protected selectActive(value: SelectItem): void {
    this.activeOption = value;
  }

  // TODO: Try to refactor, too heavy
  protected isActive(value: SelectItem): boolean {
    return this.active.find((item) => item == value.id);
  }

  protected removeClick(value: SelectItem, event: any): void {
    event.stopPropagation();
    this.remove(value);
  }

  private focusToInput(value: string = ''): void {
    setTimeout(() => {
      const el = this.element.nativeElement.querySelector('div.ui-select-container > input');
      if (el) {
        el.focus();
        this.inputValue = value;
      }
    }, 0);
  }

  private open(): void {
    if (this.options.length) {
      this.behavior.first();
    }
    this.optionsOpened = true;
  }

  private hideOptions(): void {
    this.inputMode = false;
    this.optionsOpened = false;
  }

  private selectActiveMatch(): void {
    this.selectMatch(this.activeOption);
  }

  private selectMatch(value: SelectItem, e: Event = void 0): void {

    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (!this.options.length) {
      return;
    }
    if (this.multiple === true) {
      const exists = this.active.findIndex((item) => item == value.id);
      if (exists !== -1) {
        this.active.splice(exists, 1);
        this.selectedActiveItems.splice(exists, 1);
      } else {
        this.active.push(value.id);
        this.selectedActiveItems.push(value);
      }
      this.data.emit(this.active);
      // this.open();
    } else {
      this.active = [];
      this.active.push(value.id);
      this.data.next(this.active[0]);
      this.hideOptions();
    }
    this.options = this._options;
    this.doEvent('selected', value);
    if (this.multiple === true) {
      this.focusToInput('');
    } else {
      this.focusToInput(stripTags(value.text));
      this.element.nativeElement.querySelector('.ui-select-container').focus();
    }
  }

  getText(selected) {

    const match = this._options.find((item) => {
      return JSON.stringify(item.id) === JSON.stringify(selected);
    });

    return match ? match.text : '';
  }
}

