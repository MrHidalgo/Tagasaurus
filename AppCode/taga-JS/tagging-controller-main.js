const FS = require('fs');
const PATH = require('path');
const CRYPTO = require('crypto')

//FSE is not being used but should be for the directory batch import
//const FSE = require('fs-extra');

//the object for the window functionality
const IPC_RENDERER = require('electron').ipcRenderer 

//module for the main annotation view alterations-directly affects the DOM
const TAGGING_VIEW_ANNOTATE_MODULE = require('./taga-JS/tagging-view-annotate.js');
//module for HELPING the PROCESS of deleting an image and the references to it
const TAGGING_DELETE_HELPER_MODULE = require('./myJS/tagging-delete-helper.js')
//module for the processing of the description
const DESCRIPTION_PROCESS_MODULE = require('./myJS/description-processing.js');
//module functions for DB connectivity
const TAGGING_IDB_MODULE = require('./myJS/tagging-db-fns.js'); 
//copies files and adds salt for conflicting same file names
const MY_FILE_HELPER = require('./myJS/copy-new-file-helper.js')
//functionality to insert an element into a sorted array with binary search
const MY_ARRAY_INSERT_HELPER = require('./myJS/utility-insert-into-sorted-array.js')
//the folder to store the taga images (with a commented set of alternative solutions that all appear to work)
const TAGA_IMAGE_DIRECTORY = PATH.resolve(PATH.resolve(),'images') //PATH.resolve(__dirname, '..', 'images') //PATH.join(__dirname,'..','images')  //PATH.normalize(__dirname+PATH.sep+'..') + PATH.sep + 'images'     //__dirname.substring(0, __dirname.lastIndexOf('/')) + '/images'; // './AppCode/images'
//holds the last directory the user imported images from


var TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION = {
                                    "imageFileName": '',      
                                    "imageFileHash": '',
                                    "taggingRawDescription": "",
                                    "taggingTags": [],
                                    "taggingEmotions": {good:0,bad:0},//{ happy: 0, sad: 0, confused: 0 },
                                    "taggingMemeChoices": []
                                    }

var image_files_in_dir = ''
var last_user_image_directory_chosen = ''
var processed_tag_word_list
var image_index = 1;


//For the search results of image searchees
var search_results_selected = ''
var search_results = ''
//meme search results
var search_meme_results_selected = ''
var search_meme_results = ''


//init method to run upon loading
First_Display_Init(image_index); 


//update the file variable storing the array of all the files in the folder
function Refresh_File_List() {
    image_files_in_dir = FS.readdirSync(TAGA_IMAGE_DIRECTORY)
}

//fill the IDB for 'tagging' when loading so new files are taken into account 'eventually', feed it the DB list of files
//load files in the directory but not DB, into the DB with defaults
//DB entries not in the directory are lingering entries to be deleted
async function Check_And_Handle_New_Images_IDB(current_DB_file_list) {
    //default annotation New_Image_Display(n) bj values to use when new file found
    for( ii = 0; ii < image_files_in_dir.length; ii++){
        bool_new_file_name = current_DB_file_list.some( name_tmp => name_tmp === `${image_files_in_dir[ii]}` )
        if( bool_new_file_name == false ) {
            image_name_tmp = `${image_files_in_dir[ii]}`
            tagging_entry = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
            tagging_entry.imageFileName = image_name_tmp
            tagging_entry.imageFileHash = Return_File_Hash(`${TAGA_IMAGE_DIRECTORY}/${image_name_tmp}`)
            await TAGGING_IDB_MODULE.Insert_Record(tagging_entry)
        }
    }
    //file no longer present so it's entry is to be deleted
    for( ii = 0; ii < current_DB_file_list.length; ii++){
        bool_missing_file_name = image_files_in_dir.some( name_tmp => name_tmp === `${current_DB_file_list[ii]}` )
        if( bool_missing_file_name == false ) {
            //the picture file name in context
            image_name_tmp = `${current_DB_file_list[ii]}`
            await TAGGING_IDB_MODULE.Delete_Record(image_name_tmp)
        }
    }
    await TAGGING_IDB_MODULE.Delete_Void_MemeChoices() //!!!needs to be optimized
}

//called upon app loading
async function First_Display_Init() {

    //add UI button event listeners
    document.getElementById(`left-gallery-image-button-id`).addEventListener("click", function() {
        New_Image_Display(-1);
    }, false);
    document.getElementById(`right-gallery-image-button-id`).addEventListener("click", function() {
        New_Image_Display(+1);
    }, false);
    document.getElementById(`add-new-emotion-button-id`).addEventListener("click", function() {
        Add_New_Emotion();
    }, false);
    document.getElementById(`reset-button-id`).addEventListener("click", function() {
        Reset_Image_Annotations();
    }, false);
    document.getElementById(`save-button-id`).addEventListener("click", function() {
        Save_Image_Annotation_Changes();
    }, false);
    document.getElementById(`add-new-memes-button-id`).addEventListener("click", function() {
        Add_New_Meme();
    }, false);
    document.getElementById(`return-to-main-button-id`).addEventListener("click", function() {
        location.href = "welcome-screen.html";
    }, false);
    document.getElementById(`load-new-image-button-id`).addEventListener("click", function() {
        Load_New_Image();
    }, false);
    document.getElementById(`delete-image-button-id`).addEventListener("click", function() {
        Delete_Image();
    }, false);
    document.getElementById(`search-images-button-id`).addEventListener("click", function() {
        Search_Images();
    }, false);



    await TAGGING_IDB_MODULE.Create_Db()
    await TAGGING_IDB_MODULE.Get_All_Keys_From_DB()
    current_file_list_IDB = TAGGING_IDB_MODULE.Read_All_Keys_From_DB()
    Refresh_File_List() //var image_files_in_dir = FS.readdirSync(TAGA_IMAGE_DIRECTORY)
    await Check_And_Handle_New_Images_IDB(current_file_list_IDB)

    await Load_State_Of_Image_IDB() 
}
//called from the gallery widget, where 'n' is the number of images forward or backwards to move
function New_Image_Display(n) {
    image_index += n;
    if (image_index > image_files_in_dir.length) {
        image_index = 1
    }
    if (image_index < 1) {
        image_index = image_files_in_dir.length
    };
    Load_State_Of_Image_IDB()
}

//set the emotional sliders values to the emotional vector values stored
async function Load_State_Of_Image_IDB() {
    console.log(`in LOAD STATE OF IMAGES image_index = ${image_index}, image_files_in_dir[image_index - 1] = ${image_files_in_dir[image_index - 1]} `)
    image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])
    console.log(JSON.stringify(image_annotations))
    
    TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_annotations)
}

//load the default image, typically called to avoid having nothing in the DB but can be
//deleted by the user later when they have more images stored.
async function Load_Default_Taga_Image(){

    console.log(PATH.resolve(PATH.resolve())+PATH.sep+'Taga.png')
    taga_source_path = PATH.resolve(PATH.resolve())+PATH.sep+'Taga.png'
    FS.copyFileSync(taga_source_path, `${TAGA_IMAGE_DIRECTORY}/${'Taga.png'}`, FS.constants.COPYFILE_EXCL)
    tagging_entry = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
    tagging_entry.imageFileName = 'Taga.png'
    tagging_entry.imageFileHash = Return_File_Hash(`${TAGA_IMAGE_DIRECTORY}/${'Taga.png'}`)

    await TAGGING_IDB_MODULE.Insert_Record(tagging_entry)
    Refresh_File_List()

}

function Return_File_Hash(image_file_path){
    taga_image_fileBuffer = FS.readFileSync(image_file_path);
    HASH_SUM_SHA256 = CRYPTO.createHash('sha512');
    HASH_SUM_SHA256.update(taga_image_fileBuffer)
    hex_hash_sum = HASH_SUM_SHA256.digest('hex')
    return hex_hash_sum
}

//dialog window explorer to select new images to import, and calls the functions to update the view
//checks whether the directory of the images is the taga image folder and if so returns
//returns if cancelled the selection
async function Load_New_Image() {
    
    const result = await IPC_RENDERER.invoke('dialog:tagging-new-file-select',{directory: last_user_image_directory_chosen})
    //ignore selections from the taga image folder store
    if(result.canceled == true || PATH.dirname(result.filePaths[0]) == TAGA_IMAGE_DIRECTORY) {
        return
    }

    last_user_image_directory_chosen = PATH.dirname(result.filePaths[0])
    filenames = await MY_FILE_HELPER.Copy_Non_Taga_Files(result,TAGA_IMAGE_DIRECTORY)
    if(filenames.length == 0){
        return
    }
    filenames.forEach(filename => {
        tagging_entry_tmp = JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
        tagging_entry_tmp.imageFileName = filename
        tagging_entry_tmp.imageFileHash = Return_File_Hash(`${TAGA_IMAGE_DIRECTORY}/${filename}`)
        TAGGING_IDB_MODULE.Insert_Record(tagging_entry_tmp)
        MY_ARRAY_INSERT_HELPER.Insert_Into_Sorted_Array(image_files_in_dir,filename)
    });
    filename_index = image_files_in_dir.indexOf(filenames[0]) //set index to first of the new images
    image_index = filename_index + 1
    image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index-1])
    TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_annotations)
    New_Image_Display(0)
}


//bring the image annotation view to the default state (not saving it until confirmed)
async function Reset_Image_Annotations(){
    image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])
    TAGGING_VIEW_ANNOTATE_MODULE.Reset_Image_View(image_annotations)
}


//process image for saving including the text to tags (Called from the html Save button)
async function Save_Image_Annotation_Changes() {

    new_record = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])//JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
    
    //the picture file name in context
    image_name = `${image_files_in_dir[image_index - 1]}`
    
    //save meme changes
    current_memes = new_record.taggingMemeChoices
    meme_switch_booleans = [] //meme selection toggle switch check boxes
    for (var ii = 0; ii < current_memes.length; ii++) {
        meme_boolean_tmp = document.getElementById(`meme-toggle-id-${current_memes[ii]}`).checked
        if(meme_boolean_tmp == true){
            meme_switch_booleans.push(current_memes[ii])
        }
    }
    
    //handle textual description, process for tag words
    rawDescription = document.getElementById('description-textarea-id').value
    rawDescription_processed = DESCRIPTION_PROCESS_MODULE.process_description(rawDescription)
    processed_tag_word_list = rawDescription_processed //.split(' ')

    //change the object fields accordingly
    new_record.imageFileName = image_name
    new_record.taggingMemeChoices = meme_switch_booleans
    new_record.taggingRawDescription = rawDescription
    new_record.taggingTags = processed_tag_word_list
    for( var key of Object.keys(new_record["taggingEmotions"]) ){
        new_record["taggingEmotions"][key] = document.getElementById('emotion-range-id-'+key).value
    }

    await TAGGING_IDB_MODULE.Update_Record(new_record)
    Load_State_Of_Image_IDB() //TAGGING_VIEW_ANNOTATE_MODULE.Display_Image_State_Results(image_annotations)
}

//delete image from user choice
async function Delete_Image() {
    success = await TAGGING_DELETE_HELPER_MODULE.Delete_Image_File(image_files_in_dir[image_index-1])
    if(image_files_in_dir.length == 0){
        Load_Default_Taga_Image()
    }
    //Why this is needed?.. I do not know. when I remove it the memes are not update by the time the 
    //following display call is needed. it appears there is some kind of 'race condition' i cannot track down!!!
    await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[0])
    if(success == 1){
        New_Image_Display( 0 )
    }
    Refresh_File_List()
}


//add a new emotion to the emotion set
async function Add_New_Emotion(){
    new_emotion_text = document.getElementById("emotions-new-emotion-textarea-id").value
    new_emotion_value = document.getElementById("new-emotion-range-id").value

    if(new_emotion_text){
        image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])
        keys_tmp = Object.keys(image_annotations["taggingEmotions"])
        boolean_included = keys_tmp.includes(new_emotion_text)
        if(boolean_included == false){
            image_annotations["taggingEmotions"][new_emotion_text] = new_emotion_value
            emotion_div = document.getElementById("emotion-collectionlist-div-id")

            emotion_inner_html = `<div class="emotion-list-class" id="emotion-entry-div-id-${new_emotion_text}">
                                    <img class="emotion-delete-icon-class" id="emotion-delete-button-id-${new_emotion_text}" onmouseover="this.src='taga-ui-icons/CloseRed.png';"
                                        onmouseout="this.src='taga-ui-icons/CloseBlack.png';" src="taga-ui-icons/CloseBlack.png" alt="emotions" title="remove"  />
                                    <span class="emotion-label-view-class" id="emotion-id-label-view-name-${new_emotion_text}">${new_emotion_text}</span>
                                    <input id="emotion-range-id-${new_emotion_text}" type="range" min="0" max="100" value="0">
                                </div>
                                `
            
            emotion_div.insertAdjacentHTML('beforeend', emotion_inner_html);   
            //add the delete emotion handler
            document.getElementById(`emotion-delete-button-id-${new_emotion_text}`).addEventListener("click", function() {
                Delete_Emotion(`${new_emotion_text}`);
            }, false);
            document.getElementById('emotion-range-id-'+new_emotion_text).value = `${new_emotion_value}`
            await TAGGING_IDB_MODULE.Update_Record(image_annotations)
            //do not save upon addition of a new emotion, the save button is necessary
            document.getElementById("emotions-new-emotion-textarea-id").value = ""
            document.getElementById("new-emotion-range-id").value = `0`
        } else {
            document.getElementById("emotions-new-emotion-textarea-id").value = ""
        }
         //refresh emotion container fill
        TAGGING_VIEW_ANNOTATE_MODULE.Emotion_Display_Fill(image_annotations)
    }

}


//delete an emotion from the emotion set
async function Delete_Emotion(emotion_key){
    //emotion_name = emotion_key.split("-")[1]

    element_div = document.getElementById('emotion-entry-div-id-'+emotion_key);
    element_div.remove();

    image_annotations = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])
    delete image_annotations["taggingEmotions"][emotion_key];
    await TAGGING_IDB_MODULE.Update_Record(image_annotations)

    //refresh emotion container fill
    TAGGING_VIEW_ANNOTATE_MODULE.Emotion_Display_Fill(image_annotations)
}




/*
MODAL SEARCH STUFF!!!
*/
tagging_search_obj = {
                        emotions:{},
                        searchTags:[],
                        searchMemeTags:[]
                    }
search_images_complete = false


//functionality for the searching of the images
function Search_Images(){

    // Show the modal
    let modal_search_click = document.getElementById("search-modal-click-top-id");
    modal_search_click.style.display = "block";
    // Get the button that opens the modal
    let meme_modal_close_btn = document.getElementById("modal-search-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    meme_modal_close_btn.onclick = function() {
        modal_search_click.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal_search_click) {
            modal_search_click.style.display = "none";
        }
    }


    //user presses the main search button for the add memes search modal
    document.getElementById("modal-search-main-button-id").onclick = function() {
        Modal_Search_Entry()
    }
    //user presses this to 'reset' the fields of the add memes search modal so that they become the default
    document.getElementById("modal-search-main-reset-button-id").onclick = function() {
        Search_Images_RESET_Modal_Fields()
    }

    //user presses this to 'choose' the results of the search from the images
    document.getElementById("modal-search-images-results-select-images-order-button-id").onclick = function() {
        Chose_Image_Search_Results()
    }
    //user presses this to 'choose' the results of the search from the meme images
    document.getElementById("modal-search-images-results-select-meme-images-order-button-id").onclick = function() {
        Chose_Image_Search_Meme_Results()
    }

    //populate the search modal with the fields to insert emotion tags and values
    Search_Modal_Populate_Emotions()
    document.getElementById("modal-search-emotion-entry-button-id").onclick = function() {
        Search_Modal_Emotion_Entry()
    }


}


//function to handle entry of new emotions and values for the search entry
function Search_Modal_Emotion_Entry() {
    entered_emotion_label = document.getElementById("modal-search-emotion-label-value-textarea-entry-id").value
    emotion_search_entry_value = document.getElementById("modal-search-emotion-value-range-entry-id").value
    if( entered_emotion_label != "" ) {
        tagging_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value
        Search_Modal_Populate_Emotions()
    }
}

//add the emotions from the object of the modal search to the modal view with the delete listener for each one
function Search_Modal_Populate_Emotions() {

    image_emotions_div_id = document.getElementById("modal-search-emotion-label-value-display-container-div-id")
    image_emotions_div_id.innerHTML = ""

    //Populate for the emotions of the images
    Object.keys(tagging_search_obj["emotions"]).forEach(emotion_key => {
        image_emotions_div_id.innerHTML += `
                                <span id="modal-search-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                <img class="modal-search-emotion-remove-button-class" id="modal-search-emotion-remove-button-id-${emotion_key}" onmouseover="this.src='taga-ui-icons/CloseRed.png';"
                                    onmouseout="this.src='taga-ui-icons/CloseBlack.png';" src="taga-ui-icons/CloseBlack.png" title="close" />
                                (${emotion_key},${tagging_search_obj["emotions"][emotion_key]})
                                </span>
                                `
    })

    //action listener for the removal of emotions populated from user entry
    Object.keys(tagging_search_obj["emotions"]).forEach(emotion_key => {
        document.getElementById(`modal-search-emotion-remove-button-id-${emotion_key}`).addEventListener("click", function() {
            search_emotion_search_span_html_obj = document.getElementById(`modal-search-emotion-label-value-span-id-${emotion_key}`);
            search_emotion_search_span_html_obj.remove();
            delete tagging_search_obj["emotions"][emotion_key]
            Meme_Addition_Modal_Emotion_Populate_View()
        })
    })
}


//called when the user chooses to 'reset' the fields for the search modal
function Search_Images_RESET_Modal_Fields(){
    //reset object
    tagging_search_obj = {
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }
    //clear the search form from previous entries
    document.getElementById("modal-search-tag-textarea-entry-id").value = ""
    document.getElementById("modal-search-meme-tag-textarea-entry-id").value = ""
    document.getElementById("modal-search-emotion-label-value-textarea-entry-id").value = ""
    document.getElementById("modal-search-emotion-value-range-entry-id").value = "0"
    document.getElementById("modal-search-emotion-label-value-display-container-div-id").innerHTML = ""
    document.getElementById("modal-search-images-results-grid-div-area-id").innerHTML = ""
    document.getElementById("modal-search-meme-images-results-grid-div-area-id").innerHTML = ""

    search_images_complete = false
}


//when the tagging search modal 'search' button is pressed
async function Modal_Search_Entry() {

    reg_exp_delims = /[#:,;| ]+/

    //annotation tags
    search_tags_input = document.getElementById("modal-search-tag-textarea-entry-id").value
    split_search_string = search_tags_input.split(reg_exp_delims)
    search_unique_search_terms = [...new Set(split_search_string)]
    tagging_search_obj["searchTags"] = search_unique_search_terms
    //meme tags now
    search_meme_tags_input = document.getElementById("modal-search-meme-tag-textarea-entry-id").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    tagging_search_obj["searchMemeTags"] = search_unique_meme_search_terms

    //search the DB according to this set of criteria    
    search_results = await TAGGING_IDB_MODULE.Search_Images_Basic_Relevances(tagging_search_obj)
    search_sorted_image_filename_keys = search_results[0]
    search_sorted_meme_image_filename_keys = search_results[1]
    //>>SHOW SEARCH RESULTS<<
    //search images results annotations
    search_image_results_output = document.getElementById("modal-search-images-results-grid-div-area-id")
    search_image_results_output.innerHTML = ""
    search_sorted_image_filename_keys.forEach(file_key => {
        search_image_results_output.insertAdjacentHTML('beforeend', `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-image-div-id-${file_key}" >
                                    <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-result-single-image-img-id-${file_key}" src="${TAGA_IMAGE_DIRECTORY}/${file_key}" title="view" alt="memes" />
                                </div>
                                `
                            )
    })

    //search meme results
    search_meme_results_output = document.getElementById("modal-search-meme-images-results-grid-div-area-id")
    search_meme_results_output.innerHTML = ""
    search_sorted_meme_image_filename_keys.forEach(file_key => {
        search_meme_results_output.insertAdjacentHTML('beforeend', `
                                <div class="modal-image-search-result-single-image-div-class" id="modal-image-search-result-single-meme-image-div-id-${file_key}" >
                                    <img class="modal-image-search-result-single-image-img-obj-class" id="modal-image-search-result-single-meme-image-img-id-${file_key}" src="${TAGA_IMAGE_DIRECTORY}/${file_key}" title="view" alt="memes" />
                                </div>                                
                            `
                    )
    })

    search_images_complete = true

}

//from the tagging modal for image order searches select the left pane for the images
function Chose_Image_Search_Results(){
    //Now update the current file list with the new order of pics 'search_results' which comes from the 
    if( search_images_complete == true ){
        search_sorted_image_filename_keys = search_results[0]
        search_results_selected = search_sorted_image_filename_keys
        image_files_in_dir = search_results_selected
        image_index = 1;
        Load_State_Of_Image_IDB()
        document.getElementById("search-modal-click-top-id").style.display = "none";
    }
}

//from the tagging modal for image order searches select the left pane for the meme images
function Chose_Image_Search_Meme_Results(){
    //Now update the current file list with the new order of pics 'search_results' which comes from the 
    if( search_images_complete == true ){
        search_sorted_image_filename_keys = search_results[1]
        search_results_selected = search_sorted_image_filename_keys
        image_files_in_dir = search_results_selected
        image_index = 1;
        Load_State_Of_Image_IDB()
        document.getElementById("search-modal-click-top-id").style.display = "none";
    }
}




/******************************
MEME SEARCH STUFF!!! SEARCH FOR MEMES TO ADD THEM AS AN ANNOTATION
******************************/
meme_tagging_search_obj = {
    meme_emotions:{},
    emotions:{},
    searchTags:[],
    searchMemeTags:[]
}
search_complete = false


//called from the HTML button onclik
//add a new meme which is searched for by the user
function Add_New_Meme(){
    
    // Show the modal
    var modal_add_memes_search_click = document.getElementById("search-add-memes-modal-click-top-id");
    modal_add_memes_search_click.style.display = "block";
    // Get the button that opens the modal
    var meme_modal_close_btn = document.getElementById("modal-search-add-memes-close-exit-view-button-id");
    // When the user clicks on the button, close the modal
    meme_modal_close_btn.onclick = function() {
        modal_add_memes_search_click.style.display = "none";
    }
    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function(event) {
        if (event.target == modal_add_memes_search_click) {
            modal_add_memes_search_click.style.display = "none";
        }
    }
    //user presses the main search button for the add memes search modal
    document.getElementById("modal-search-add-memes-main-button-id").onclick = function() {
        Modal_Meme_Search_Btn()
    }
    //user presses it after the fields have been entered to search the images to then add memes
    var select_search_modal_meme_images = document.getElementById("modal-search-add-memes-images-results-select-images-order-button-id")
    select_search_modal_meme_images.onclick = function() {
        Meme_Choose_Search_Results()
    }
    //user presses this to 'reset' the fields of the add memes search modal so that they become the default
    var select_reset_modal_meme_add_images_fields = document.getElementById("modal-search-add-memes-reset-button-id")
    select_reset_modal_meme_add_images_fields.onclick = function() {
        Search_Add_Meme_RESET_Modal_Fields()
    }

    //populate the search meme modal with the fields to insert emotion tags and values and handle new emotion entries
    Meme_Addition_Modal_Emotion_Populate_View()
    document.getElementById("modal-search-add-memes-emotion-entry-button-id").onclick = function() {
        Meme_Addition_Modal_Emotion_Entry('image_emotion')
    }
    document.getElementById("modal-search-add-memes-emotion-meme-entry-button-id").onclick = function() {
        Meme_Addition_Modal_Emotion_Entry('meme_emotion')
    }

}

//function to handle entry of new emotions and values for the search entry
function Meme_Addition_Modal_Emotion_Entry(image_or_meme_emotion) {
    if( image_or_meme_emotion == 'image_emotion') {
        entered_emotion_label = document.getElementById("modal-search-add-memes-emotion-label-value-textarea-entry-id").value
        emotion_search_entry_value = document.getElementById("modal-search-add-memes-emotion-value-range-entry-id").value
        if( entered_emotion_label != "" ) {
            meme_tagging_search_obj["emotions"][entered_emotion_label] = emotion_search_entry_value
            Meme_Addition_Modal_Emotion_Populate_View()
        }
    } else if( image_or_meme_emotion == 'meme_emotion') {
        entered_emotion_label = document.getElementById("modal-search-add-memes-emotion-meme-label-value-textarea-entry-id").value
        emotion_search_entry_value = document.getElementById("modal-search-add-memes-emotion-meme-value-range-entry-id").value
        if( entered_emotion_label != "" ) {
            meme_tagging_search_obj["meme_emotions"][entered_emotion_label] = emotion_search_entry_value
            Meme_Addition_Modal_Emotion_Populate_View()
        }
    }
}

//For the user entered emotion label-value pair to be displayed on the modal and included into the search object
function Meme_Addition_Modal_Emotion_Populate_View() {

    image_emotions_div_id = document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id")
    image_emotions_div_id.innerHTML = ""
    image_memes_emotions_div_id = document.getElementById("modal-search-add-memes-emotion-meme-label-value-display-container-div-id")
    image_memes_emotions_div_id.innerHTML = ""

    //Populate for the emotions of the images
    Object.keys(meme_tagging_search_obj["emotions"]).forEach(emotion_key => {
        image_emotions_div_id.innerHTML += `
                                <span id="modal-search-add-memes-emotion-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                <img class="modal-search-add-memes-emotion-remove-button-class" id="modal-search-add-memes-emotion-remove-button-id-${emotion_key}" onmouseover="this.src='taga-ui-icons/CloseRed.png';"
                                    onmouseout="this.src='taga-ui-icons/CloseBlack.png';" src="taga-ui-icons/CloseBlack.png" title="close" />
                                (${emotion_key},${meme_tagging_search_obj["emotions"][emotion_key]})
                                </span>
                                `
    })
    //Populate for the emotions of the memes of the images
    Object.keys(meme_tagging_search_obj["meme_emotions"]).forEach(emotion_key => {
        image_memes_emotions_div_id.innerHTML += `
                                <span id="modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}" style="white-space:nowrap">
                                    <img class="modal-search-add-memes-emotion-remove-button-class" id="modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}" onmouseover="this.src='taga-ui-icons/CloseRed.png';"
                                        onmouseout="this.src='taga-ui-icons/CloseBlack.png';" src="taga-ui-icons/CloseBlack.png" title="close" />
                                    (${emotion_key},${meme_tagging_search_obj["meme_emotions"][emotion_key]})
                                </span>
                                `
    })

    //action listener for the removal of emotions populated from user entry
    Object.keys(meme_tagging_search_obj["emotions"]).forEach(emotion_key => {
        document.getElementById(`modal-search-add-memes-emotion-remove-button-id-${emotion_key}`).addEventListener("click", function() {
            search_emotion_search_span_html_obj = document.getElementById(`modal-search-add-memes-emotion-label-value-span-id-${emotion_key}`);
            search_emotion_search_span_html_obj.remove();
            delete meme_tagging_search_obj["emotions"][emotion_key]
            Meme_Addition_Modal_Emotion_Populate_View()
        })
    })
    //action listener for the removal of meme emotions populated from user entry
    Object.keys(meme_tagging_search_obj["meme_emotions"]).forEach(emotion_key => {
        document.getElementById(`modal-search-add-memes-emotion-meme-remove-button-id-${emotion_key}`).addEventListener("click", function() {
            search_meme_emotion_search_span_html_obj = document.getElementById(`modal-search-add-memes-emotion-meme-label-value-span-id-${emotion_key}`);
            search_meme_emotion_search_span_html_obj.remove();
            delete meme_tagging_search_obj["meme_emotions"][emotion_key]
            Meme_Addition_Modal_Emotion_Populate_View()
        })
    })

}

//called when the user chooses to 'reset' the fields for the meme search modal
function Search_Add_Meme_RESET_Modal_Fields(){
    //reset object
    meme_tagging_search_obj = {
        meme_emotions:{},
        emotions:{},
        searchTags:[],
        searchMemeTags:[]
    }
    //clear the search form from previous entries
    document.getElementById("modal-search-add-memes-tag-textarea-entry-id").value = ""
    document.getElementById("modal-search-add-memes-tag-textarea-memes-entry-id").value = ""
    document.getElementById("modal-search-add-memes-emotion-label-value-textarea-entry-id").value = ""
    document.getElementById("modal-search-add-memes-emotion-meme-label-value-textarea-entry-id").value = ""
    document.getElementById("modal-search-add-memes-emotion-value-range-entry-id").value = "0"
    document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id").value = ""
    document.getElementById("modal-search-add-memes-emotion-meme-value-range-entry-id").value = "0"
    document.getElementById("modal-search-add-memes-emotion-label-value-display-container-div-id").innerHTML = ""
    document.getElementById("modal-search-add-memes-emotion-meme-label-value-display-container-div-id").innerHTML = ""
    document.getElementById("modal-search-add-memes-images-results-grid-div-area-id").innerHTML = ""
    document.getElementById("modal-search-add-memes-meme-images-results-grid-div-area-id").innerHTML = ""
    search_meme_complete = false
}


//after the search is done and 
async function Meme_Choose_Search_Results(){
    //Now update the current file list with the new order of pics 'search_results' which comes from the 
    //DB search function
    if( search_meme_complete == true ){
        
        record = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])//JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
        memes_current = record.taggingMemeChoices

        //meme selection switch check boxes
        meme_switch_booleans = []
        for (var ii = 0; ii < image_files_in_dir.length; ii++) {
            if(memes_current.includes(image_files_in_dir[ii]) == false && record.imageFileName != image_files_in_dir[ii]){  //exclude memes already present
                    meme_boolean_tmp1 = document.getElementById(`add-memes-images-toggle-id-${image_files_in_dir[ii]}`).checked
                    meme_boolean_tmp2 = document.getElementById(`add-memes-meme-toggle-id-${image_files_in_dir[ii]}`).checked
                    if(meme_boolean_tmp1 == true || meme_boolean_tmp2 == true){
                        meme_switch_booleans.push(image_files_in_dir[ii])
                    }
            }
        }
        
        meme_switch_booleans.push(...record.taggingMemeChoices)
        record.taggingMemeChoices = [...new Set(meme_switch_booleans)]
        await TAGGING_IDB_MODULE.Update_Record(record)
        
        Load_State_Of_Image_IDB()

        modal_add_memes_search_click = document.getElementById("search-add-memes-modal-click-top-id");
        modal_add_memes_search_click.style.display = "none";
    }

}


//the functionality to use the object to search the DB for relevant memes
async function Modal_Meme_Search_Btn(){

    //after doing the search

    reg_exp_delims = /[#:,;| ]+/

    //image annotation tags
    search_tags_input = document.getElementById("modal-search-add-memes-tag-textarea-entry-id").value
    split_search_string = search_tags_input.split(reg_exp_delims)
    search_unique_search_terms = [...new Set(split_search_string)]
    meme_tagging_search_obj["searchTags"] = search_unique_search_terms

    //meme tags now
    search_meme_tags_input = document.getElementById("modal-search-add-memes-tag-textarea-memes-entry-id").value
    split_meme_search_string = search_meme_tags_input.split(reg_exp_delims)
    search_unique_meme_search_terms = [...new Set(split_meme_search_string)]
    meme_tagging_search_obj["searchMemeTags"] = search_unique_meme_search_terms

    console.log(`the meme search term object is = ${JSON.stringify(meme_tagging_search_obj)}`)

    //search the DB according to this set of criteria
    //look through the keys and find the overlapping set
    search_meme_results = await TAGGING_IDB_MODULE.Search_Meme_Images_Basic_Relevances(meme_tagging_search_obj)
    search_meme_complete = true
    
    search_sorted_meme_image_filename_keys = search_meme_results[0]
    search_sorted_image_filename_keys = search_meme_results[1]
    
    //>>SHOW SEARCH RESULTS<<
    //search images results annotations
    search_image_results_output = document.getElementById("search-meme-image-results-box-label")

    //get the record to know the memes that are present to not present any redundancy
    record = await TAGGING_IDB_MODULE.Get_Record(image_files_in_dir[image_index - 1])//JSON.parse(JSON.stringify(TAGGING_DEFAULT_EMPTY_IMAGE_ANNOTATION));
    memes_current = record.taggingMemeChoices

    //search results display images
    search_meme_images_results_output = document.getElementById("modal-search-add-memes-images-results-grid-div-area-id")
    search_meme_images_results_output.innerHTML = ""
    search_sorted_meme_image_filename_keys.forEach(file_key => {
        if(memes_current.includes(file_key) == false && record.imageFileName != file_key){  //exclude memes already present
            //console.log(`add-memes-images-toggle-id-${file_key}`)
            search_meme_images_results_output.insertAdjacentHTML('beforeend', `
                <label class="add-memes-memeswitch" title="deselect / include" >   
                    <input id="add-memes-images-toggle-id-${file_key}" type="checkbox" > 
                    <span class="add-memes-slider"></span>   
                </label>
                <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-image-div-id-${file_key}" >
                    <img class="modal-image-search-add-memes-result-single-image-img-obj-class" id="modal-image-search-add-memes-result-single-image-img-id-${file_key}" src="${TAGA_IMAGE_DIRECTORY}/${file_key}" title="view" alt="memes" />
                </div>
                `
            )
        }
    })
    //search results display image memes
    search_meme_images_memes_results_output = document.getElementById("modal-search-add-memes-meme-images-results-grid-div-area-id")
    search_meme_images_memes_results_output.innerHTML = ""
    search_sorted_image_filename_keys.forEach(file_key => {
        if(memes_current.includes(file_key) == false && record.imageFileName != file_key){  //exclude memes already present
            search_meme_images_memes_results_output.insertAdjacentHTML('beforeend', `
                <label class="add-memes-memeswitch" title="deselect / include" >   
                    <input id="add-memes-meme-toggle-id-${file_key}" type="checkbox" > 
                    <span class="add-memes-slider"></span>   
                </label>
                <div class="modal-image-search-add-memes-result-single-image-div-class" id="modal-image-search-add-memes-result-single-meme-image-div-id-${file_key}" >
                    <img class="modal-image-search-add-memes-result-single-image-img-obj-class" id="modal-image-search-add-memes-result-single-meme-image-img-id-${file_key}" src="${TAGA_IMAGE_DIRECTORY}/${file_key}" title="view" alt="memes" />
                </div>
                `
            )
        }
    })

}



