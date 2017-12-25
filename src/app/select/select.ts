import { Component, Input, Output, EventEmitter, ElementRef, OnInit, forwardRef, OnChanges, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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

  @Input() public allowClear: boolean = false;
  @Input() public placeholder: string = '';
  @Input() public idField: string;
  @Input() public textField: string;
  @Input() public childrenField: string = 'children';
  @Input() public multiple: boolean = false;
  @Input('items') items: any;

  @Input("ngModel") ngModel: any;
  @Input("ngModelChange") ngModelChange = new EventEmitter<any>();

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
    if (typeof selectedItems === 'string' && selectedItems.length) {
      selectedItems = [selectedItems];
    }
    if (!selectedItems || selectedItems.length === 0) {
      this._active = [];
    } else {
      this._active = selectedItems.map((item: any) => {
        let data;
        if (typeof item === 'string') {
          const exists = this.itemObjects.find((obj) => obj.id == item);
          data = exists || item;
        } else {
          data = {
            id: this.resolvePath(this.idField, item),
            text: this.resolvePath(this.textField, item)
          };
        }
        return new SelectItem(data);
      });
    }
  }

  @Output() public data: EventEmitter<any> = new EventEmitter();
  @Output() public selected: EventEmitter<any> = new EventEmitter();
  @Output() public removed: EventEmitter<any> = new EventEmitter();
  @Output() public typed: EventEmitter<any> = new EventEmitter();
  @Output() public opened: EventEmitter<any> = new EventEmitter();

  public options: Array<SelectItem> = [];
  public itemObjects: Array<SelectItem> = [];
  public activeOption: SelectItem;
  public element: ElementRef;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.items) {
      let value: any = changes.items.currentValue;

      if (!value) {
        this._items = this.itemObjects = [];
      } else {
        this._items = value.filter((item: any) => {
          if ((typeof item === 'string') || (typeof item === 'object' && item && this.resolvePath(this.textField, item) && this.resolvePath(this.idField, item))) {
            return item;
          }
        });
        this.itemObjects = this._items.map((item: any) => (typeof item === 'string' ? new SelectItem(item) : new SelectItem({ id: this.resolvePath(this.idField, item), text: this.resolvePath(this.textField, item), children: item[this.childrenField] })));

        this._active = this._active.map((item: any) => {
          let data;
          if (this.idField != this.textField && item.id == item.text) {
            const exists = this.itemObjects.find((obj) => obj.id === item.id);
            data = exists || item;
          }
          return new SelectItem(data);
        });

      }
    }
  }

  public get active(): any {
    return this._active;
  }

  resolvePath(path, obj) {
    return path.split('.').reduce(function (prev, curr) {
      return prev ? prev[curr] : undefined;
    }, obj || self);
  }

  private set optionsOpened(value: boolean) {

    this._optionsOpened = value;
    this.opened.emit(value);
  }

  private get optionsOpened(): boolean {
    return this._optionsOpened;
  }

  protected onChange: any = Function.prototype;
  protected onTouched: any = Function.prototype;

  private inputMode: boolean = false;
  private _optionsOpened: boolean = false;
  private behavior: OptionsBehavior;
  private inputValue: string = '';
  private _items: Array<any> = [];
  private _disabled: boolean = false;
  private _active: Array<SelectItem> = [];

  public constructor(element: ElementRef, private sanitizer: DomSanitizer) {
    this.element = element;
    this.clickedOutside = this.clickedOutside.bind(this);
  }

  public sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
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
      let el: any = this.element.nativeElement
        .querySelector('div.ui-select-container > input');
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
    if (!isUpMode && e.keyCode === 37 && this._items.length > 0) {
      this.behavior.first();
      e.preventDefault();
      return;
    }
    // right
    if (!isUpMode && e.keyCode === 39 && this._items.length > 0) {
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

  public ngOnInit(): any {
    this.behavior = (this.firstItemHasChildren) ?
      new ChildrenBehavior(this) : new GenericBehavior(this);

    this.ngModelChange.emit(this.ngModel);
  }

  public remove(item: SelectItem): void {
    if (this._disabled === true) {
      return;
    }
    if (this.multiple === true && this.active) {
      let index = this.active.indexOf(item);
      this.active.splice(index, 1);
      this.data.next(this.active);
      this.doEvent('removed', item);
    }
    if (this.multiple === false) {
      this.active = [];
      this.data.next(this.active[0].id);
      this.doEvent('removed', item);
    }
  }

  public doEvent(type: string, value: any): void {
    if ((this as any)[type] && value) {
      (this as any)[type].next(value.id);
    }
    this.onTouched();
    if (type === 'selected' || type === 'removed') {
      let val;
      if (this.multiple) {
        val = this.active.map((rec) => rec.id);
      } else {
        val = this.active.length ? this.active[0].id : '';
      }
      this.onChange(val);
    }
  }

  public clickedOutside(): void {
    this.inputMode = false;
    this.optionsOpened = false;
  }

  public get firstItemHasChildren(): boolean {
    return this.itemObjects[0] && this.itemObjects[0].hasChildren();
  }

  public writeValue(val: any): void {
    this.active = val;
    if (this.multiple) {
      this.data.emit(this.active);
    } else {
      this.data.next(this.active.length ? this.active[0].id : '');
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
    let value = String
      .fromCharCode(96 <= event.keyCode && event.keyCode <= 105 ? event.keyCode - 48 : event.keyCode)
      .toLowerCase();
    this.focusToInput(value);
    this.open();
    let target = event.target || event.srcElement;
    target.value = value;
    this.inputEvent(event);
  }

  // Highlight option which has focus in the list
  protected selectActive(value: SelectItem): void {
    this.activeOption = value;
  }

  // TODO: Try to refactor, too heavy
  protected isActive(value: SelectItem): boolean {
    return this.active.find((item) => item.id == value.id);
    // return this.activeOption.id === value.id;
  }

  protected removeClick(value: SelectItem, event: any): void {
    event.stopPropagation();
    this.remove(value);
  }

  private focusToInput(value: string = ''): void {
    setTimeout(() => {
      let el = this.element.nativeElement.querySelector('div.ui-select-container > input');
      if (el) {
        el.focus();
        this.inputValue = value;
      }
    }, 0);
  }

  private open(): void {
    this.options = this.itemObjects;
    /* this.options = this.itemObjects.filter((option: SelectItem) => {
      return !this.multiple || (this.multiple && !this.active.find((o: SelectItem) => option.text === o.text));
    }); */

    if (this.options.length > 0) {
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
    if (this.options.length <= 0) {
      return;
    }
    if (this.multiple === true) {
      const exists = this.active.findIndex((item) => item.id == value.id);
      if (exists !== -1) {
        this.active.splice(exists, 1);
      } else {
        this.active.push(value);
      }
      this.data.emit(this.active);
      // this.open();
    } else {
      this.active = [];
      this.active.push(value);
      this.data.next(this.active[0].id);
      this.hideOptions();
    }
    this.doEvent('selected', value);
    if (this.multiple === true) {
      this.focusToInput('');
      this.options = this.itemObjects;
    } else {
      this.focusToInput(stripTags(value.text));
      this.element.nativeElement.querySelector('.ui-select-container').focus();
    }
  }
}

