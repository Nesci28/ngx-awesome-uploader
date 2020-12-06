import { FilePickerService } from './../../file-picker.service';
import { FilePreviewModel } from './../../file-preview.model';
import { Component, OnInit, Input, Output, EventEmitter, TemplateRef } from '@angular/core';
import { SafeResourceUrl } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { getFileType} from '../../file-upload.utils';
import {  Subscription } from 'rxjs';
import { FilePickerAdapter, UploadResponse, UploadStatus } from '../../file-picker.adapter';
import { UploaderCaptions } from '../../uploader-captions';

@Component({
  selector: 'file-preview-item',
  templateUrl: './file-preview-item.component.html',
  styleUrls: ['./file-preview-item.component.scss']
})
export class FilePreviewItemComponent implements OnInit {
  @Output() public readonly removeFile = new EventEmitter<FilePreviewModel>();
  @Output() public readonly uploadSuccess = new EventEmitter<FilePreviewModel>();
  @Output() public readonly uploadFail = new EventEmitter<HttpErrorResponse>();
  @Output() public readonly imageClicked = new EventEmitter<FilePreviewModel>();
  @Input() public readonly fileItem: FilePreviewModel;
  @Input() adapter: FilePickerAdapter;
  @Input() itemTemplate: TemplateRef<any>;
  @Input() captions: UploaderCaptions;
  @Input() enableAutoUpload: boolean;
  public icon = 'checkmark';
  public uploadProgress: number;
  public fileType: string;
  public safeUrl: SafeResourceUrl;
  public uploadError: boolean;
  public uploadResponse: any;
  private _uploadSubscription: Subscription;
  constructor(
    private fileService: FilePickerService,
  ) {}

  public ngOnInit() {
    this._uploadFile(this.fileItem);
    this.fileType = getFileType(this.fileItem.file.type);
    this.safeUrl = this.getSafeUrl(this.fileItem.file);
  }

  public getSafeUrl(file: File | Blob): SafeResourceUrl {
    return this.fileService.createSafeUrl(file);
  }
  /** Converts bytes to nice size */
  niceBytes(x): string {
    const units = ['bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    let l = 0;
    let n = parseInt(x, 10) || 0;
    while (n >= 1024 && ++l) {
      n = n / 1024;
    }
    // include a decimal point and a tenths-place digit if presenting
    // less than ten of KB or greater units
    return n.toFixed(n < 10 && l > 0 ? 1 : 0) + ' ' + units[l];
  }
  /** Retry file upload when upload was unsuccessfull */
  public onRetry(): void {
    this._uploadFile(this.fileItem);
  }

  public onRemove(fileItem: FilePreviewModel): void {
    this._uploadUnsubscribe();
    this.removeFile.next({
      ...fileItem,
      uploadResponse: this.uploadResponse
    });
   }

  public onCheckMarkClick() {
    this.icon = 'error';
  }

  private _uploadFile(fileItem: FilePreviewModel): void {
    if (!this.enableAutoUpload) {
      return;
    }
    if (this.adapter) {
      this._uploadSubscription =
      this.adapter.uploadFile(fileItem)
      .subscribe((res: UploadResponse) => {
        if (res && res.status === UploadStatus.UPLOADED) {
          this._onUploadSuccess(res.body, fileItem);
          this.uploadProgress = undefined;
        }
        if (res && res.status === UploadStatus.IN_PROGRESS) {
          this.uploadProgress = res.progress;
        }
        if (res && res.status === UploadStatus.ERROR) {
          this.uploadError = true;
          this.uploadFail.next(res.body);
          this.uploadProgress = undefined;
        }
      }, (er: HttpErrorResponse) => {
        this.uploadError = true;
        this.uploadFail.next(er);
        this.uploadProgress = undefined;
  });
    } else {
      console.warn('no adapter was provided');
    }
  }
  /** Emits event when file upload api returns success  */
  private _onUploadSuccess(uploadResponse: any, fileItem: FilePreviewModel): void {
    this.uploadResponse = uploadResponse;
    this.fileItem.uploadResponse = uploadResponse;
    this.uploadSuccess.next({...fileItem, uploadResponse});
  }

 /** Cancel upload. Cancels request  */
 private _uploadUnsubscribe(): void {
  if (this._uploadSubscription) {
    this._uploadSubscription.unsubscribe();
   }
 }

}
